import React, { useState, useEffect, useRef } from 'react';
import { wordSearchService } from './wordSearchService';
import WordSearchGrid from './WordSearchGrid';
import WordSearchWordList from './WordSearchWordList';
import WordSearchResult from './WordSearchResult';
import SModal from '../../../../components/common/SModal';
import { useSearchParams, useNavigate, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './wordSearch.css';

const WordSearchFeature = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const difficultyFromUrl = searchParams.get('difficulty') || 'easy';

  const [status, setStatus] = useState('loading'); // 'loading', 'ready', 'playing', 'paused', 'completed', 'error'
  const [difficulty, setDifficulty] = useState(difficultyFromUrl);
  const [puzzle, setPuzzle] = useState(null);
  const [foundWords, setFoundWords] = useState([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (status === 'playing' || status === 'paused') && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowExitModal(true);
    }
  }, [blocker]);

  const handleConfirmExit = async () => {
    setShowExitModal(false);
    setStatus('loading'); // Change status so the blocker doesn't trigger again

    if (puzzle && puzzle.uuid) {
      try {
        await wordSearchService.abortGame(puzzle.uuid);
      } catch (err) {
        console.error('Failed to abort game on backend', err);
      }
    }

    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      navigate('/games/word-search');
    }
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (status === 'playing' || status === 'paused') {
        const message = 'You have a game in progress. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  const timerRef = useRef(null);

  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const fetchedRef = useRef(false);
  
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      handleFetchPuzzle(difficultyFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetchPuzzle = async (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setStatus('loading');
    setErrorMsg('');
    setFoundWords([]);
    setTimeElapsed(0);

    try {
      const data = await wordSearchService.startPuzzle(selectedDifficulty);
      setPuzzle(data);
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'We couldn\'t load the puzzle.');
      setStatus('error');
    }
  };

  const handleValidation = async (startCoord, endCoord) => {
    if (status !== 'playing') return { correct: false };
    if (!puzzle) return { correct: false };
    
    try {
      const result = await wordSearchService.validateWord(puzzle.uuid, startCoord, endCoord);
      if (result.correct) {
        if (!foundWords.includes(result.wordUuid)) {
          const newFound = [...foundWords, result.wordUuid];
          setFoundWords(newFound);
          
          if (newFound.length === puzzle.words.length) {
            handleCompletion(newFound);
          }
        }
      }
      return result;
    } catch (err) {
      console.error('Validation error', err);
      return { correct: false };
    }
  };

  const handleCompletion = async (allFoundWords) => {
    if (status !== 'playing') return;
    setStatus('loading');
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      const result = await wordSearchService.completeGame(puzzle.uuid, allFoundWords, timeElapsed);
      setFinalScore(result.score);
      setStatus('completed');
      setSearchParams({}); // Clear query params on completion
    } catch (err) {
      console.error('Completion error', err);
      setErrorMsg('Error submitting score. Please try again.');
      setStatus('error');
    }
  };

  const handleHint = async () => {
    if (status !== 'playing') return null;
    // Basic hint: randomly find an unfound word and request hint
    const unfound = puzzle.words.filter(w => !foundWords.includes(w.uuid));
    if (unfound.length === 0) return null;
    
    const randomWord = unfound[Math.floor(Math.random() * unfound.length)];
    try {
      const hint = await wordSearchService.getHint(puzzle.uuid, randomWord.uuid);
      return hint; // { startRow, startColumn }
    } catch (err) {
      console.error('Hint error', err);
      return null;
    }
  };

  return (
    <div className="ws-container page-container">
      {status === 'loading' && (
        <div className="ws-loading">{t('games.word_search.preparing')}</div>
      )}

      {status === 'error' && (
        <div className="ws-error">
          <p>{errorMsg}</p>
          <button className="s-button" onClick={() => navigate('/games/word-search')}>{t('games.word_search.return_to_menu')}</button>
        </div>
      )}

      {(status === 'ready' || status === 'playing' || status === 'paused') && puzzle && (
        <div className="ws-game">
          <div className="ws-game-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>{t('games.word_search.title')}</h2>
            <div className="ws-action-buttons" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              {status !== 'ready' && (
                <div className="ws-timer" style={{ fontSize: '1.25rem', fontWeight: 600, fontFamily: 'var(--mono)' }}>
                  {Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:{(timeElapsed % 60).toString().padStart(2, '0')}
                </div>
              )}
              {status === 'ready' && <button className="s-button btn-primary" onClick={() => setStatus('playing')}>{t('games.word_search.start')}</button>}
              {status === 'playing' && <button className="s-button btn-primary" onClick={() => setStatus('paused')}>{t('games.word_search.pause')}</button>}
              {status === 'paused' && <button className="s-button btn-primary" onClick={() => setStatus('playing')}>{t('games.word_search.resume')}</button>}
              <button className="s-button btn-secondary" onClick={() => {
                if (status === 'ready') {
                  navigate('/games/word-search');
                } else {
                  setShowExitModal(true);
                }
              }}>{t('games.word_search.exit')}</button>
            </div>
          </div>
          <div className={`ws-main ${status !== 'playing' ? 'ws-blurred' : ''}`}>
            <WordSearchGrid 
              grid={puzzle.grid} 
              onValidate={handleValidation}
              onHint={handleHint}
            />
            <WordSearchWordList 
              words={puzzle.words} 
              foundWords={foundWords} 
            />
          </div>
        </div>
      )}

      {status === 'completed' && (
        <WordSearchResult 
          score={finalScore} 
          timeElapsed={timeElapsed} 
          onPlayAgain={() => {
            navigate('/games/word-search');
          }} 
        />
      )}

      <SModal 
        isOpen={showExitModal} 
        title={t('games.word_search.exit_modal_title')}
        confirmText={t('games.word_search.exit_modal_confirm')}
        cancelText={t('games.word_search.exit_modal_cancel')}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      >
        <p>{t('games.word_search.exit_modal_body')}</p>
      </SModal>
    </div>
  );
};

export default WordSearchFeature;
