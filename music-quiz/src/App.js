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

  const toggleLeaderboard = () => {
    setShowLeaderboard(!showLeaderboard);
  };

  const playAudio = () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    const audio = new Audio(questions[current].audio);
    audio.volume = volume;
    audio.play();
    
    // Update play count for current clip
    setPlayCounts(prev => ({
      ...prev,
      [current]: (prev[current] || 0) + 1
    }));
    
    setTimeout(() => {
      setIsPlaying(false);
    }, 1000);
  };

  const playVictorySound = () => {
    new Audio('/RockitMan.mp3').play();
  };

  const calculateScore = () => {
    const points = Math.max(0, 3 - attemptCount);
    return points;
  };

  const moveToNextQuestion = () => {
    setIsExiting(true);
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % questions.length);
      setShowResult(false);
      setSelected(null);
      setIsCorrect(false);
      setIsExiting(false);
      setDisabledOptions([]);
      setAttemptCount(0);
      setShowCorrectAnswer(false);
      setQuestionKey(prev => prev + 1);
    }, 800);
  };

  const getRandomPosition = () => {
    return {
      x: Math.random() * 100,
      y: Math.random() * 100
    };
  };

  const handleAnswer = (answer, index) => {
    setSelected(answer);
    const isCorrectAnswer = answer === questions[current].correct;
    setIsCorrect(isCorrectAnswer);
    
    if (isCorrectAnswer) {
      // Disable all other options immediately
      const allIndices = questions[current].options.map((_, i) => i);
      setDisabledOptions(allIndices.filter(i => i !== index));
      
      setShowResult(true);
      setShowConfetti(true);
      const points = calculateScore();
      setScore(prev => prev + points);
      playVictorySound();
      setIsJohnAnimating(true);
      setBgPosition(getRandomPosition());
      setTimeout(() => {
        setShowConfetti(false);
        moveToNextQuestion();
        setIsJohnAnimating(false);
        setJohnPosition(prev => prev + 100);
      }, 1000);
    } else {
      setDisabledOptions(prev => [...prev, index]);
      setShakeIndex(index);
      setAttemptCount(prev => prev + 1);
      
      if (attemptCount + 1 >= 3) {
        setShowCorrectAnswer(true);
        setShowResult(true);
        setTimeout(() => {
          moveToNextQuestion();
        }, 1500);
      } else {
        setShowResult(true);
        setTimeout(() => {
          setShakeIndex(null);
          setShowResult(false);
        }, 500);
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  return (
    <>
      <div 
        className="background-container"
        style={{
          backgroundPosition: `${bgPosition.x}% ${bgPosition.y}%`
        }}
      />
      <img 
        src="/john.png" 
        alt="John Lennon" 
        className={`john-background ${isJohnAnimating ? 'animate' : ''}`}
        style={{
          transform: `translateY(${johnPosition}px)`
        }}
      />
      <div className="score-board" onClick={toggleLeaderboard}>
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
      <div className={`leaderboard-overlay ${showLeaderboard ? 'visible' : ''}`} onClick={toggleLeaderboard}>
        <div className="leaderboard" onClick={e => e.stopPropagation()}>
          <h2>🏆 Leaderboard</h2>
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
            <span>Your Score: {score}</span>
          </div>
          <div className="play-stats">
            <span>Plays this clip: {playCounts[current] || 0}</span>
          </div>
        </div>
      </div>
      <div 
        key={`question-${questionKey}`}
        className={`quiz-container ${isExiting ? 'exit' : ''} ${isPlaying ? 'playing' : ''} ${showLeaderboard ? 'hidden' : ''}`}
      >
        <div className="center-hole"></div>
        {showConfetti && (
          <Confetti
            numberOfPieces={500}
            recycle={false}
            gravity={0.3}
            wind={0.05}
            colors={['#FFD700', '#FF69B4', '#00FF00', '#FF4500', '#4169E1', '#FF1493', '#7B68EE']}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              animation: 'fadeOut 5s forwards'
            }}
            initialVelocityY={0}
          />
        )}
        <div className="beatles-images">
          <img src="/paul.png" alt="Paul McCartney" />
          <img src="/john.png" alt="John Lennon" />
          <img src="/george.png" alt="George Harrison" />
          <img src="/ringo.png" alt="Ringo Starr" />
        </div>
        <h1>🎵 Guess the Song</h1>
        <div 
          className={`center-label ${isPlaying ? 'playing' : ''}`}
          onClick={playAudio}
        >
          <div className="play-icon"></div>
        </div>
        <div className="options">
          {questions[current].options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt, i)}
              className={`answer-button ${shakeIndex === i ? 'shake' : ''} ${
                disabledOptions.includes(i) ? 'disabled' : ''
              } ${
                selected && opt === selected && opt === questions[current].correct
                  ? 'correct'
                  : selected && opt === selected
                  ? 'incorrect'
                  : showCorrectAnswer && opt === questions[current].correct
                  ? 'correct'
                  : ''
              }`}
              disabled={disabledOptions.includes(i) || showCorrectAnswer}
            >
              {opt}
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
    </>
  );
}

export default App;
