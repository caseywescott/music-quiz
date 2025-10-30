# Music Quiz Game Logic Documentation

## Overview

This document outlines the core game mechanics and logic for the Music Quiz application, structured to facilitate implementation in the Dojo framework for Starknet. Players listen to audio clips and attempt to identify the correct song title from a list of options.

## Core Game Components

### 1. Song Structure

```typescript
interface Song {
  id: number; // Unique identifier for the song
  //audioPath: string; // Local path to the audio file
  title: string; // Correct song title - get file path from this
  options: string[]; // Array of possible song titles to choose from
  difficulty: number; // 1-5 scale for difficulty
}
```

### 2. Game State

```typescript
interface GameState {
  currentSong: number;
  score: number;
  playCounts: Map<number, number>; // Tracks how many times each clip has been played
  selectedTitles: Map<number, string>; // Maps song IDs to selected titles
  isPlaying: boolean;
  volume: number;
}
```

## Game Mechanics

### 1. Song Selection and VRF Implementation

The game uses Cartridge's VRF for fair and verifiable song selection. Here's the implementation:

```rust
// VRF Provider Interface
#[starknet::interface]
trait IVrfProvider<TContractState> {
    fn request_random(self: @TContractState, caller: ContractAddress, source: Source);
    fn consume_random(ref self: TContractState, source: Source) -> felt252;
}

#[derive(Drop, Copy, Clone, Serde)]
pub enum Source {
    Nonce: ContractAddress,
    Salt: felt252,
}

// Game Contract Implementation
#[starknet::contract]
mod MusicQuiz {
    use starknet::ContractAddress;
    use starknet::get_caller_address;

    const VRF_PROVIDER_ADDRESS: ContractAddress = starknet::contract_address_const::<0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f>();

    #[external(v0)]
    fn get_next_song(ref self: ContractState) {
        // Request random number
        let vrf_provider = IVrfProviderDispatcher { contract_address: VRF_PROVIDER_ADDRESS };
        let player_id = get_caller_address();
        let random_value = vrf_provider.consume_random(Source::Nonce(player_id));

        // Map random value to song ID
        let song_id = self.map_random_to_song(random_value);

        // Load and emit song
        self.load_song(song_id);
    }

    #[internal]
    fn map_random_to_song(ref self: ContractState, random_value: felt252) -> u32 {
        // Map random value to available song pool
        // Ensure no song is repeated until all songs have been used
        let total_songs = self.get_total_songs();
        let song_id = (random_value % total_songs.into()).try_into().unwrap();

        // Check if song has been used
        if self.is_song_used(song_id) {
            // Find next available song
            return self.find_next_available_song(song_id);
        }

        song_id
    }
}
```

### 2. Frontend Integration with VRF

```typescript
// Frontend implementation for VRF integration
async function getNextSong() {
  const call = await account.execute([
    // Request random number
    {
      contractAddress: VRF_PROVIDER_ADDRESS,
      entrypoint: "request_random",
      calldata: CallData.compile({
        caller: GAME_CONTRACT,
        source: { type: 0, address: account.address },
      }),
    },
    // Get next song
    {
      contractAddress: GAME_CONTRACT,
      entrypoint: "get_next_song",
      calldata: [],
    },
  ]);
}
```

### 3. Scoring System

- Base score calculation:

  ```rust
  #[external(v0)]
  fn calculate_score(
      ref self: ContractState,
      is_correct: bool,
      difficulty: u32,
      play_count: u32,
      time_to_answer: u32
  ) -> u32 {
      let base_score = if is_correct { 100 } else { 0 };
      let difficulty_multiplier = difficulty;
      let play_count_penalty = if play_count > 1 { play_count - 1 } else { 0 };
      let time_bonus = if time_to_answer < 5 { (5 - time_to_answer) * 10 } else { 0 };

      (base_score * difficulty_multiplier) - (play_count_penalty * 10) + time_bonus
  }
  ```

### 4. Audio Playback Rules

- Each audio clip can be played multiple times
- Play count affects scoring (penalty for multiple plays)
- Maximum play count should be tracked per song
- Volume control should be persisted in game state

### 5. Title Validation

```rust
#[external(v0)]
fn validate_title(
    ref self: ContractState,
    song_id: u32,
    selected_title: felt252,
    correct_title: felt252
) -> bool {
    // Compare selected title with correct title
    // Return true if correct, false if incorrect
    selected_title == correct_title
}
```

### 4. Leaderboard Management

```rust
#[derive(Drop, Copy, Clone, Serde)]
struct LeaderboardEntry {
    player: ContractAddress,
    score: u32,
    timestamp: u64,
}

#[storage_var]
fn leaderboard(player: ContractAddress) -> LeaderboardEntry;

#[event]
fn LeaderboardUpdated {
    player: ContractAddress,
    score: u32,
}

#[external(v0)]
fn update_leaderboard(ref self: ContractState, player: ContractAddress, score: u32) {
    // Create new leaderboard entry
    let entry = LeaderboardEntry {
        player,
        score,
        timestamp: starknet::get_block_timestamp(),
    };

    // Store entry in contract storage
    self.leaderboard.write(player, entry);

    // Emit event for frontend updates and indexers
    self.emit(LeaderboardUpdated { player, score });
}

#[view]
fn get_player_score(self: @ContractState, player: ContractAddress) -> u32 {
    let entry = self.leaderboard.read(player);
    entry.score
}

#[view]
fn get_top_scores(self: @ContractState, limit: u32) -> Array<LeaderboardEntry> {
    // Note: This is a simplified implementation
    // In practice, you might want to:
    // 1. Use an off-chain indexer to maintain sorted scores
    // 2. Implement a more efficient on-chain sorting mechanism
    // 3. Use a different data structure for top-N scores
    let mut scores = ArrayTrait::new();
    // Implementation details for retrieving top scores
    scores
}
```

## Smart Contract Integration Points

### 1. Game Initialization

```rust
#[external(v0)]
fn initialize_game(ref self: ContractState) {
    // Set up initial game state
    // Initialize VRF
    // Load first song
    self.game_state.write(GameState::default());
    self.load_first_song();
}
```

### 2. Song Management

```rust
#[external(v0)]
fn load_song(ref self: ContractState, song_id: u32) {
    // Load song data
    // Update game state
    // Emit events for frontend
    let song = self.songs.read(song_id);
    self.current_song.write(song);
    self.emit(SongLoaded { song_id });
}
```

### 3. Score Tracking

```rust
#[external(v0)]
fn update_score(
    ref self: ContractState,
    song_id: u32,
    is_correct: bool,
    time_to_answer: u32
) {
    // Calculate new score
    let score = self.calculate_score(is_correct, song_id, time_to_answer);

    // Update player's score in storage
    self.scores.write(self.get_caller_address(), score);

    // Update leaderboard with new score
    self.update_leaderboard(self.get_caller_address(), score);

    // Emit score update event for frontend
    self.emit(ScoreUpdated {
        player: self.get_caller_address(),
        score
    });
}
```

## Security Considerations

### 1. VRF Implementation

- Using Cartridge's VRF for atomic, verifiable randomness
- VRF request and response processed in same transaction
- Onchain verification using Stark curve and Poseidon hash
- Synchronous randomness generation for immediate song selection

### 2. Score Verification

- Implement score verification on-chain
- Prevent score manipulation
- Track and validate all game actions

### 3. Anti-Cheat Measures

- Implement cooldown periods between songs
- Track and limit play counts
- Validate title submission timing

## Frontend Integration

### 1. State Management

- Sync frontend state with on-chain state
- Handle loading states
- Manage audio playback
- Display real-time leaderboard updates

### 2. Event Handling

- Listen for on-chain events
- Update UI based on game state changes
- Handle error states
- Process leaderboard updates

### 3. User Feedback

- Display score updates
- Show correct/incorrect feedback
- Update leaderboard in real-time
- Show player rankings

## Implementation Checklist

1. Smart Contract Development

   - [ ] Implement Cartridge VRF integration
   - [ ] Create scoring system
   - [ ] Set up on-chain leaderboard storage
   - [ ] Implement leaderboard update logic
   - [ ] Add leaderboard query functions
   - [ ] Implement anti-cheat measures

2. Frontend Integration

   - [ ] Connect to smart contracts
   - [ ] Implement state management
   - [ ] Handle audio playback
   - [ ] Create user feedback system
   - [ ] Display leaderboard
   - [ ] Handle real-time updates

3. Testing
   - [ ] Unit tests for game logic
   - [ ] Integration tests
   - [ ] Security audits
   - [ ] Performance testing

## Notes for Dojo Implementation

1. Use Dojo's entity system for:

   - Game state management
   - Song storage
   - Leaderboard entries

2. Leverage Dojo's event system for:

   - Game state updates
   - Score changes
   - Leaderboard updates

3. Utilize Dojo's storage system for:
   - Persistent game data
   - User statistics
   - Song metadata

## Future Considerations

1. Additional Features

   - Multiplayer support
   - Tournament system
   - Achievement system
   - NFT rewards

2. Performance Optimizations

   - Batch processing for leaderboard updates
   - Optimized storage patterns
   - Gas optimization

3. Scalability
   - Handle multiple concurrent games
   - Support for more songs
   - Enhanced leaderboard features
