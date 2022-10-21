import React from 'react';
import axios from 'axios';

import backspaceIcon  from './icons/backspace.svg';
import enterIcon      from './icons/enter.svg';
import statisticsIcon from './icons/statistics.svg';
import refreshIcon    from './icons/refresh.svg';
import crossIcon      from './icons/cross.svg';
import playAgainIcon  from './icons/play-again.svg';

import './App.css';

const guessLen = 5;

class App extends React.Component {
  state = {
    solution: [],
    words:    [],

    guesses: [[], [], [], [], [], []],
    currentGuess: 0,

    animatingCharGuess: null,
    animatingChar:      null,
    canGuess:           true,

    inSolution: [[], [], [], [], [], []],
    rightPlace: [[], [], [], [], [], []],

    allTried:      [],
    allInSolution: [],
    allRightPlace: [],

    statisticsModalEnabled: false,

    statistics: localStorage.getItem('stats') !== null
      ? JSON.parse(localStorage.getItem('stats'))
      : {
        played:        0,
        wins:          0,
        currentStreak: 0,
        maxStreak:     0,
        distribution:  [0, 0, 0, 0, 0, 0]
      }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.keyPresses);

    if (localStorage.getItem('state') !== null) {
      let state = JSON.parse(localStorage.getItem('state'));

      this.setState({ ...state });
    } else {
      axios.get(`words/solutions${guessLen}.txt`)
        .then((res) => {
          this.setState({
            solution: [ ...res.data.split('\n')[Math.floor(Math.random() * res.data.split('\n').length)] ]
          }, () => console.log(this.state.solution.join('')));
        });
    }

    axios.get(`words/dictionary${guessLen}.txt`)
      .then((res) => {
        this.setState({ words: res.data.split('\n') });
      });
  }

  keyPresses = ({ key }) => {
    const { guesses, currentGuess } = this.state;

    if (!this.state.canGuess) {
      return;
    }

    let newGuesses = guesses;

    if (/^[a-zA-Z]$/.test(key) && guesses[currentGuess].length < guessLen) {
      newGuesses[currentGuess].push(key.toLowerCase());

      this.setState({
        animatingCharGuess: currentGuess,
        animatingChar: newGuesses[currentGuess].length - 1
      }, () => setTimeout(() => {
        this.setState({
          animatingCharGuess: null,
          animatingChar: null
        });
      }, 100));
    }

    if (key === 'Backspace' && guesses[currentGuess].length > 0) {
      newGuesses[currentGuess].pop();
    }

    if (key === 'Enter' && guesses[currentGuess].length === guessLen && this.state.words.includes(guesses[currentGuess].join(''))) {
      this.checkGuess();

      if (currentGuess + 1 > 5 || guesses[currentGuess].join() === this.state.solution.join()) {
        let statistics = this.state.statistics;

        statistics.played += 1;

        if (guesses[currentGuess].join() === this.state.solution.join()) {
          statistics.wins += 1;
          statistics.currentStreak += 1;

          if (statistics.currentStreak > statistics.maxStreak) {
            statistics.maxStreak = statistics.currentStreak;
          }
          statistics.distribution[currentGuess] += 1;
        } else {
          statistics.currentStreak = 0;
        }

        this.setState({ statistics: statistics });
        localStorage.setItem('stats', JSON.stringify(statistics));

        this.setState({ canGuess: false });
        setTimeout(() => this.setState({ statisticsModalEnabled: true }), 750);
      } else {
        this.setState({
          currentGuess: currentGuess + 1,
          animatingCharGuess: null,
          animatingChar: null
        });
      }

      let state = { ...this.state };

      delete state.words;
      delete state.animatingCharGuess;
      delete state.animatingChar;
      delete state.statisticsModalEnabled;
      delete state.statistics;

      localStorage.setItem('state', JSON.stringify(state));
    }

    this.setState({ guesses: newGuesses });
  }

  checkGuess() {
    const { guesses, currentGuess } = this.state;

    let solution = [...this.state.solution];
    let guess = [...guesses[currentGuess]];

    let rightPlace = [];
    let inSolution = [];

    let allRightPlace = [...this.state.allRightPlace];
    let allInSolution = [...this.state.allInSolution];
    let allTried = [...this.state.allTried];

    guess.forEach((char, index) => {
      if (solution[index] === guess[index]) {
        rightPlace.push(true);
        allRightPlace.push(char);

        solution[index] = null;
      } else {
        rightPlace.push(false);
      }
    });

    guess.forEach((char) => {
      if (solution.includes(char)) {
        inSolution.push(true);
        allInSolution.push(char);

        solution[solution.indexOf(char)] = null;
      } else {
        inSolution.push(false);
      }
    });

    allTried.push(...guess);

    let stateRightPlace = this.state.rightPlace;
    let stateInSolution = this.state.inSolution;

    stateRightPlace[currentGuess] = rightPlace;
    stateInSolution[currentGuess] = inSolution;

    this.setState({
      rightPlace: stateRightPlace,
      inSolution: stateInSolution,

      allRightPlace: allRightPlace,
      allInSolution: allInSolution,
      allTried: allTried
    });
  }

  getCharClass = (guessIndex, charIndex) => {
    const { currentGuess, rightPlace, inSolution } = this.state;

    if (currentGuess === guessIndex && this.state.canGuess) {
      return 'square square-unchecked';
    }

    if (rightPlace[guessIndex][charIndex]) {
      return 'square square-active-right';
    }

    if (inSolution[guessIndex][charIndex]) {
      return 'square square-active-in-solution';
    }

    return 'square square-active-wrong';
  }

  getkeyClass = (char) => {
    if (char === 'Enter' || char === 'Backspace') {
      return 'key key-large';
    }

    if (this.state.allRightPlace.includes(char)) {
      return 'key key-right';
    }

    if (this.state.allInSolution.includes(char)) {
      return 'key key-in-solution';
    }

    if (this.state.allTried.includes(char)) {
      return 'key key-wrong';
    }

    return 'key';
  }

  distributionPoint = ({ guessIndex }) => {
    const { statistics, currentGuess } = this.state;

    let className;

    if (guessIndex === currentGuess && this.state.guesses[currentGuess].join() === this.state.solution.join()) {
      className = 'distribution-bar game-distribution-bar';
    } else {
      className = 'distribution-bar';
    }

    return (
      <div className="distribution-point">
        <p>{guessIndex + 1}</p>
        <div
          className={className}
          style={{
            width: `${statistics.distribution[guessIndex] / statistics.played * 100 + 5}%`,
            textAlign: statistics.distribution[guessIndex] !== 0 ? 'end' : 'center',
          }}
        >
          {statistics.distribution[guessIndex]}
        </div>
      </div>
    );
  }

  render() {
    const { statistics } = this.state;

    return (
      <>
        <div className="wrapper">
          <div className="heading-text">
            <img
              className="heading-icon"
              style={{ float: 'left' }}
              src={refreshIcon}
              alt="refresh"
              onClick={() => {
                localStorage.removeItem('state');
                window.location.reload();
              }}
            />

            <img
              className="heading-icon"
              style={{ float: 'right' }}
              src={statisticsIcon}
              alt="info"
              onClick={() => {
                this.setState({ statisticsModalEnabled: true });
              }}
            />

            WORDLE

            <sup style={{ fontSize: '20px' }}>
              {guessLen}
            </sup>
          </div>
          <div className="bar" />

          <table className="game-table">
            <tbody>
              {this.state.guesses.map((guess, guessIndex) => (
                <tr key={`${guessIndex}${guess}`}>
                  {guess.map((char, charIndex) => (
                    <td
                      key={`game${charIndex}${guessIndex}${char}`}
                      className={this.getCharClass(guessIndex, charIndex)}
                      style={{ animation: this.state.animatingCharGuess === guessIndex && this.state.animatingChar === charIndex && 'pop 0.1s linear' }}
                    >
                      {char.toUpperCase()}
                    </td>
                  ))}

                  {Array.apply(null, Array(guessLen - guess.length)).map((_, charIndex) => (
                    <td
                      key={`gameInactive${charIndex}${guessIndex}`}
                      className="square square-inactive"
                    >
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="keyboard">
            {[[...'qwertyuiop'], [...'asdfghjkl'], ['Enter', ...'zxcvbnm', 'Backspace']].map((slice) => (
              <div key={`row${slice}`}>
                {slice.map((char) => (
                  <div
                    key={`keyboard${char}`}
                    className={this.getkeyClass(char)}
                    onClick={() => this.keyPresses({ key: char })}
                  >
                    {char !== 'Enter' && char !== 'Backspace'
                      ? char.toUpperCase()
                      : char === 'Enter'
                        ? <img
                          style={{ position: 'relative', top: '6px' }}
                          src={enterIcon}
                          alt="enter"
                        />
                        : <img
                          style={{ position: 'relative', top: '6px' }}
                          src={backspaceIcon}
                          alt="backspace"
                        />
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {!this.state.canGuess && this.state.guesses[this.state.currentGuess].join() !== this.state.solution.join() &&
          <div className="chip">
            {this.state.solution.join('')}
          </div>
        }

        {this.state.statisticsModalEnabled &&
          <div className="modal-background" onClick={() => this.setState({ statisticsModalEnabled: false })}>
            <div className="modal statistics-modal" onClick={(e) => e.stopPropagation()}>
              <img className="modal-cross" src={crossIcon} alt="exit" onClick={() => this.setState({ statisticsModalEnabled: false })} />

              <h3 style={{ margin: '5px' }}>
                STATISTICS
              </h3>
              <div className="statistics">
                <div>
                  <h1>{statistics.played}</h1>
                  <p>Played</p>
                </div>
                <div>
                  <h1>{statistics.played > 0 ? Math.floor(statistics.wins / statistics.played * 100) : 0}</h1>
                  <p>Win %</p>
                </div>
                <div>
                  <h1>{statistics.currentStreak}</h1>
                  <p>Current Streak</p>
                </div>
                <div>
                  <h1>{statistics.maxStreak}</h1>
                  <p>Max Streak</p>
                </div>
              </div>

              <h3 style={{ margin: '10px 5px 5px 5px' }}>
                GUESS DISTRIBUTION
              </h3>
              <div className="distribution">
                <this.distributionPoint guessIndex={0} />
                <this.distributionPoint guessIndex={1} />
                <this.distributionPoint guessIndex={2} />
                <this.distributionPoint guessIndex={3} />
                <this.distributionPoint guessIndex={4} />
                <this.distributionPoint guessIndex={5} />
              </div>

              {!this.state.canGuess &&
                <button
                  className="play-again-button"
                  onClick={() => {
                    localStorage.removeItem('state');
                    window.location.reload();
                  }}
                >
                  PLAY AGAIN
                  <img
                    style={{ position: 'relative', top: '2px', marginLeft: '10px' }}
                    src={playAgainIcon}
                    alt="play again"
                  />
                </button>
              }
            </div>
          </div>
        }
      </>
    );
  }
}

export default App;
