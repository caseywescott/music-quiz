import React, { useState } from 'react';
import Confetti from 'react-confetti';
import './App.css';
import beatlesMap from './images/beatles_map.png';

const questions = [
  {
    audio: '/audio/1.mp3',
    options: ['Let It Be', 'Hey Jude', 'Come Together', 'Something'],
    correct: 'Hey Jude'
  },
  {
    audio: '/audio/2.mp3',
    options: ['Billie Jean', 'Thriller', 'Smooth Criminal', 'Beat It'],
    correct: 'Beat It'
  }
];

// Sample leaderboard data - you can replace this with real data later
const leaderboardData = [
  { name: "John", score: 950 },
  { name: "Paul", score: 890 },
  { name: "George", score: 850 },
  { name: "Ringo", score: 820 },
  { name: "Yoko", score: 780 }
];

function App() {
  const [current, setCurrent] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeIndex, setShakeIndex] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isExiting, setIsExiting] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [disabledOptions, setDisabledOptions] = useState([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [johnPosition, setJohnPosition] = useState(0);
  const [isJohnAnimating, setIsJohnAnimating] = useState(false);
  const [bgPosition, setBgPosition] = useState({ x: 50, y: 50 });
  const [playCounts, setPlayCounts] = useState({});
  const [questionKey, setQuestionKey] = useState(0);
  const [buttonStates, setButtonStates] = useState({});

  const toggleLeaderboard = () => {
    setShowLeaderboard(!showLeaderboard);
  };

  const playAudio = () => {
    if (isPlaying) return; // Prevent multiple clicks while playing
    
    setIsPlaying(true);
    const audio = new Audio(questions[current].audio);
    audio.volume = volume;
    
    // Add error handling
    audio.onerror = (e) => {
      console.error('Error playing audio:', e);
      setIsPlaying(false);
    };
    
    // Add success handling
    audio.onplay = () => {
      console.log('Audio started playing');
    };
    
    // Add ended handling
    audio.onended = () => {
      console.log('Audio finished playing');
      setIsPlaying(false);
    };
    
    // Play the audio
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    });
    
    // Update play count for current clip
    setPlayCounts(prev => ({
      ...prev,
      [current]: (prev[current] || 0) + 1
    }));
    
    // After 1 second, stop playing and reset button
    setTimeout(() => {
      setIsPlaying(false);
      audio.pause();
      audio.currentTime = 0;
    }, 1000);
  };

  const playVictorySound = () => {
    const victorySound = new Audio('/RockitMan.mp3');
    victorySound.volume = volume;
    victorySound.play();
  };

  const calculateScore = () => {
    const points = Math.max(0, 3 - attemptCount);
    return points;
  };

  const moveToNextQuestion = () => {
    setIsExiting(true);
    // First, ensure all non-correct buttons stay dissolved
    setButtonStates(prev => {
      const newState = { ...prev };
      questions[current].options.forEach((opt, i) => {
        if (opt !== questions[current].correct) {
          newState[i] = {
            ...newState[i],
            dissolved: true,
            selected: false,
            isCorrect: false,
            exploded: prev[i]?.exploded || false
          };
        }
      });
      return newState;
    });

    // Wait for exit animation to complete before resetting states
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % questions.length);
      setShowResult(false);
      setSelected(null);
      setIsCorrect(false);
      setIsExiting(false);
      setAttemptCount(0);
      setShowCorrectAnswer(false);
      setQuestionKey(prev => prev + 1);
      // Only reset button states after the exit animation
      setTimeout(() => {
        setButtonStates({});
      }, 100);
      setPlayCounts(prev => ({
        ...prev,
        [current]: 0
      }));
    }, 800);
  };

  const getRandomPosition = () => {
    return {
      x: Math.random() * 100,
      y: Math.random() * 100
    };
  };

  const handleAnswer = (answer, index) => {
    // Update only the clicked button's state
    setButtonStates(prev => ({
      ...prev,
      [index]: {
        selected: true,
        isCorrect: answer === questions[current].correct
      }
    }));

    setSelected(answer);
    const isCorrectAnswer = answer === questions[current].correct;
    setIsCorrect(isCorrectAnswer);
    
    if (isCorrectAnswer) {
      // Add dissolved class to all non-selected buttons while preserving exploded state
      setButtonStates(prev => {
        const newState = { ...prev };
        questions[current].options.forEach((_, i) => {
          if (i !== index) {
            newState[i] = {
              ...newState[i],
              dissolved: true,
              selected: false,
              isCorrect: false,
              // Preserve the exploded state if it exists
              exploded: prev[i]?.exploded || false
            };
          }
        });
        return newState;
      });

      setShowResult(true);
      setShowConfetti(true);
      const points = calculateScore();
      setScore(prev => prev + points);
      playVictorySound();
      setIsJohnAnimating(true);
      setBgPosition(getRandomPosition());
      
      // Wait for dissolve animation to complete (0.6s) before moving to next question
      setTimeout(() => {
        setShowConfetti(false);
        moveToNextQuestion();
        setIsJohnAnimating(false);
        setJohnPosition(prev => prev + 100);
      }, 1000); // Reduced from 2000ms to 1000ms to account for faster dissolve
    } else {
      setAttemptCount(prev => prev + 1);
      setShowResult(true);
      
      // First do the shake animation
      setTimeout(() => {
        setShowResult(false);
        // After shake completes, mark as exploded to start dissolve
        setButtonStates(prev => ({
          ...prev,
          [index]: {
            selected: false,
            isCorrect: false,
            exploded: true
          }
        }));
      }, 600); // Reduced from 1200ms to 600ms to match faster shake

      // Check if we should move to next question after all attempts
      if (attemptCount + 1 >= 3) {
        setShowCorrectAnswer(true);
        // Mark all buttons as dissolved except the correct one
        setButtonStates(prev => {
          const newState = { ...prev };
          questions[current].options.forEach((opt, i) => {
            if (opt !== questions[current].correct) {
              newState[i] = {
                ...newState[i],
                dissolved: true,
                selected: false,
                isCorrect: false,
                // Preserve the exploded state if it exists
                exploded: prev[i]?.exploded || false
              };
            }
          });
          return newState;
        });
        // Wait for dissolve animation to complete before moving to next question
        setTimeout(() => {
          moveToNextQuestion();
        }, 1000); // Reduced from 2000ms to 1000ms to account for faster dissolve
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  return (
    <div id="wrap">
      <div 
        className="background-container"
        style={{
          backgroundPosition: `${bgPosition.x}% ${bgPosition.y}%`
        }}
      />
      <div className="score-board">
        <div className="label">Score</div>
        <div className="value">{score}</div>
      </div>
      <div className="volume-control">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
          title="Adjust volume"
        />
      </div>
      <div className={`leaderboard-overlay ${showLeaderboard ? 'visible' : ''}`}>
        <div className="leaderboard">
          <h2>Leaderboard</h2>
          <div className="leaderboard-list">
            {leaderboardData.map((entry, index) => (
              <div key={index} className="leaderboard-entry">
                <span className="rank">#{index + 1}</span>
                <span className="name">{entry.name}</span>
                <span className="score">{entry.score}</span>
              </div>
            ))}
          </div>
          <div className="current-score">
            Your Score: {score}
          </div>
        </div>
      </div>
      
      <button 
        className="leaderboard-toggle"
        onClick={toggleLeaderboard}
        style={{
          position: 'fixed',
          left: showLeaderboard ? '310px' : '10px',
          top: '20px',
          zIndex: 1001,
          padding: '10px 15px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '5px',
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        {showLeaderboard ? '← Hide' : 'Show →'}
      </button>

      <div className={`quiz-container ${isExiting ? 'exit' : ''}`}>
        <img 
          src="/john.png" 
          alt="John Lennon" 
          className={`john-background ${isJohnAnimating ? 'animate' : ''}`}
          style={{
            transform: `translateY(${johnPosition}px)`
          }}
        />
        
        <div id="album" key={`question-${questionKey}`} className={`quiz-container ${isExiting ? 'exit' : ''}`}>
          <div id="vinyl" className={`vinyl ${isPlaying ? 'playing' : ''}`}>
            <div className="vinyl-label">
              <div className="wood-circle">
                <div className="metal-ring">
                  <div 
                    className={`vintage-button ${isPlaying ? 'pressed' : ''}`}
                    onClick={playAudio}
                  >
                    <div className={isPlaying ? 'stop-icon' : 'play-icon'}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="options">
            {questions[current].options.map((opt, i) => (
              <button
                key={i}
                className={`answer-button ${
                  buttonStates[i]?.selected ? 'selected' : ''
                } ${
                  buttonStates[i]?.selected && buttonStates[i]?.isCorrect ? 'correct' : ''
                } ${
                  buttonStates[i]?.selected && !buttonStates[i]?.isCorrect ? 'incorrect' : ''
                } ${
                  buttonStates[i]?.exploded ? 'exploded' : ''
                } ${
                  buttonStates[i]?.dissolved ? 'dissolved' : ''
                }`}
                onClick={() => handleAnswer(opt, i)}
                disabled={showCorrectAnswer || buttonStates[i]?.exploded}
              >
                <div className="frame-with-shadow">
                  <div className="wooden-frame">
                    <div className="woodgrain-base"></div>
                    <div className="inner-frame">
                      <div className="text-display">{opt}</div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {showResult && (
            <div className={`result ${isCorrect ? 'correct' : showCorrectAnswer ? 'incorrect' : 'incorrect'}`}>
              <p>
                {isCorrect 
                  ? `✅ Correct! +${calculateScore()} points!` 
                  : showCorrectAnswer 
                    ? `❌ The correct answer was: ${questions[current].correct}`
                    : '❌ Wrong!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;