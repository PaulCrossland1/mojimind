document.addEventListener('DOMContentLoaded', function() {
    // Game constants
    const MAX_GUESSES = 6;
    const CODE_LENGTH = 5;
    const EMOJIS_TO_SELECT = 15;
    const VISIBLE_GUESSES = 5;
    
    // A pool of 50 emojis as requested
    const EMOJI_POOL = [
        '😀', '😎', '🥳', '🤔', '😴', 
        '🐱', '🐶', '🐼', '🐨', '🦊',
        '🍎', '🍌', '🍉', '🍇', '🍓',
        '🚀', '🚗', '🚲', '✈️', '🛸',
        '⚽', '🏀', '🎾', '🏓', '🎯',
        '🎸', '🎹', '🎺', '🎻', '🥁',
        '💡', '💎', '🔑', '⌚', '📱',
        '🌈', '🌞', '⭐', '🌙', '☁️',
        '🏠', '🏰', '🏝️', '🏔️', '🌋',
        '❤️', '🧩', '🎁', '🎨', '🔮'
    ];
    
    // Game state
    let todaysEmojis = [];
    let secretCode = [];
    let currentGuess = Array(CODE_LENGTH).fill(null);
    let guessHistory = [];
    let gameOver = false;
    
    // DOM elements
    const gameContainer = document.querySelector('.game-container');
    const boardContainer = document.getElementById('board-container');
    const currentGuessContainer = document.getElementById('current-guess-container');
    const currentGuessElement = document.getElementById('current-guess');
    const guessSlots = document.querySelectorAll('.guess-slot');
    const submitBtn = document.getElementById('submit-btn');
    const emojiKeyboard = document.getElementById('emoji-keyboard');
    const guessesCounter = document.getElementById('guesses-counter');
    const howToPlayButton = document.getElementById('how-to-play');
    const gameDateElement = document.getElementById('game-date');
    
    // Seeded random number generator
    function seedRandom(seed) {
        let state = seed;
        
        return function() {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }
    
    // Get today's date in UTC format for consistent seeding
    function getTodayUTC() {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth();
        const day = now.getUTCDate();
        
        return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
    
    // Helper functions for date formatting
    function getFormattedDate() {
        const today = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
        return today.toLocaleDateString('en-US', options);
    }
    
    function updateDateDisplay() {
        const formattedDate = getFormattedDate();
        if (gameDateElement) {
            gameDateElement.textContent = formattedDate;
        }
    }
    
    // Initialize game
    function initGame() {
        // Update date display
        updateDateDisplay();
        
        // Set up new game with today's date as seed
        const today = getTodayUTC();
        const seed = today.getTime();
        const random = seedRandom(seed);
        
        // Select today's emojis
        selectTodaysEmojis(random);
        
        // Generate secret code from today's emojis
        generateSecretCode(random);
        
        // Create emoji keyboard
        createEmojiKeyboard();
        
        // Reset guesses counter
        updateGuessesCounter();
        
        // Show rules modal
        showRulesModal();
    }
    
    // Select today's 10 emojis from the pool
    function selectTodaysEmojis(random) {
        // Create a copy of the emoji pool to shuffle
        const shuffledPool = [...EMOJI_POOL];
        
        // Fisher-Yates shuffle using seeded random
        for (let i = shuffledPool.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
        }
        
        // Take the first 10 emojis
        todaysEmojis = shuffledPool.slice(0, EMOJIS_TO_SELECT);
    }
    
    // Generate the secret 5-emoji code from today's emojis
    function generateSecretCode(random) {
        secretCode = [];
        
        // Generate 5 positions, allowing duplicates
        for (let i = 0; i < CODE_LENGTH; i++) {
            const index = Math.floor(random() * EMOJIS_TO_SELECT);
            secretCode.push(todaysEmojis[index]);
        }
        
        // For debugging only - remove in production
        console.log('Today\'s emojis:', todaysEmojis);
        console.log('Secret code:', secretCode);
    }
    
    // Create emoji keyboard with today's emojis - 2 rows of 5
    function createEmojiKeyboard() {
        emojiKeyboard.innerHTML = '';
        
        // Create a container for the keyboard grid
        const keyboardGrid = document.createElement('div');
        keyboardGrid.classList.add('emoji-keyboard-grid');
        
        // Add each emoji to the keyboard
        todaysEmojis.forEach((emoji, index) => {
            const emojiKey = document.createElement('button');
            emojiKey.classList.add('emoji-key');
            emojiKey.textContent = emoji;
            emojiKey.dataset.emoji = emoji;
            emojiKey.addEventListener('click', () => handleEmojiSelection(emoji));
            keyboardGrid.appendChild(emojiKey);
        });
        
        emojiKeyboard.appendChild(keyboardGrid);
    }
    
    // Handle emoji selection
    function handleEmojiSelection(emoji) {
        if (gameOver) return;
        
        // Find the first empty slot
        const emptySlotIndex = currentGuess.findIndex(slot => slot === null);
        
        if (emptySlotIndex !== -1) {
            // Fill the slot with the emoji
            currentGuess[emptySlotIndex] = emoji;
            
            // Update the UI
            const slot = guessSlots[emptySlotIndex];
            slot.textContent = emoji;
            slot.classList.add('filled');
            
            // Check if all slots are filled
            if (currentGuess.every(slot => slot !== null)) {
                submitBtn.disabled = false;
            }
        }
    }
    
    // Handle slot click to clear it
    function handleSlotClick(event) {
        if (gameOver) return;
        
        const slot = event.currentTarget;
        const index = parseInt(slot.dataset.index);
        
        if (currentGuess[index] !== null) {
            // Clear the slot
            currentGuess[index] = null;
            slot.textContent = '';
            slot.classList.remove('filled');
            
            // Disable submit button
            submitBtn.disabled = true;
        }
    }
    
    // Submit current guess
    function submitGuess() {
        if (gameOver || currentGuess.some(slot => slot === null)) return;
        
        // Generate feedback
        const feedback = getFeedback(currentGuess, secretCode);
        
        // Add to history
        guessHistory.push({
            emojis: [...currentGuess],
            feedback: feedback
        });
        
        // Check if game is won (all feedback is green)
        const isWon = feedback.every(fb => fb === 'green');
        
        // Check if game is over (won or max guesses reached)
        if (isWon || guessHistory.length >= MAX_GUESSES) {
            gameOver = true;
            showCompletionModal(isWon);
        }
        
        // Update the board
        updateBoard();
        
        // Reset current guess
        resetCurrentGuess();
        
        // Update guesses counter
        updateGuessesCounter();
    }
    
    // Generate feedback for a guess - Wordle style
    function getFeedback(guess, code) {
        // Make copies to work with
        const guessCopy = [...guess];
        const codeCopy = [...code];
        const result = Array(CODE_LENGTH).fill('grey');
        
        // First pass: Check for correct emoji in correct position (green)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (guessCopy[i] === codeCopy[i]) {
                result[i] = 'green';
                // Mark as matched
                codeCopy[i] = null;
                guessCopy[i] = null;
            }
        }
        
        // Second pass: Check for correct emoji in wrong position (yellow)
        for (let i = 0; i < CODE_LENGTH; i++) {
            if (guessCopy[i] !== null) {
                const codeIndex = codeCopy.findIndex(emoji => emoji === guessCopy[i]);
                if (codeIndex !== -1) {
                    result[i] = 'yellow';
                    // Mark as matched
                    codeCopy[codeIndex] = null;
                }
            }
        }
        
        // Update the color of the emojis in the keyboard
        updateKeyboardColors(guess, result);
        
        return result;
    }
    
    // Update keyboard colors based on feedback
    function updateKeyboardColors(guess, feedback) {
        guess.forEach((emoji, index) => {
            const keyboardKey = document.querySelector(`.emoji-key[data-emoji="${emoji}"]`);
            if (keyboardKey) {
                // Only update if the current state isn't better
                // Priority: green > yellow > grey
                const currentState = keyboardKey.dataset.state || 'unused';
                const newState = feedback[index];
                
                if (newState === 'green' || 
                    (newState === 'yellow' && currentState !== 'green') ||
                    (newState === 'grey' && currentState !== 'green' && currentState !== 'yellow')) {
                    keyboardKey.dataset.state = newState;
                    // Add appropriate class for styling
                    keyboardKey.classList.remove('emoji-key-green', 'emoji-key-yellow', 'emoji-key-grey');
                    keyboardKey.classList.add(`emoji-key-${newState}`);
                }
            }
        });
    }
    
    // Update the board with guess history
    function updateBoard() {
        boardContainer.innerHTML = '';
        
        // Show only the last X guesses
        const startIndex = Math.max(0, guessHistory.length - VISIBLE_GUESSES);
        const visibleGuesses = guessHistory.slice(startIndex);
        
        // Add rows for visible guesses
        visibleGuesses.forEach(guess => {
            const row = createGuessRow(guess);
            boardContainer.appendChild(row);
        });
        
        // Scroll to the bottom
        boardContainer.scrollTop = boardContainer.scrollHeight;
    }
    
    // Create a row for a guess - Wordle style feedback
    function createGuessRow(guess) {
        const row = document.createElement('div');
        row.classList.add('guess-row');
        
        // Create emojis section with feedback background colors
        const emojisContainer = document.createElement('div');
        emojisContainer.classList.add('guess-emojis');
        
        guess.emojis.forEach((emoji, index) => {
            const emojiElement = document.createElement('div');
            emojiElement.classList.add('guess-emoji');
            
            // Add color class based on feedback
            if (guess.feedback[index] === 'green') {
                emojiElement.classList.add('guess-emoji-green');
            } else if (guess.feedback[index] === 'yellow') {
                emojiElement.classList.add('guess-emoji-yellow');
            } else {
                emojiElement.classList.add('guess-emoji-grey');
            }
            
            emojiElement.textContent = emoji;
            emojisContainer.appendChild(emojiElement);
        });
        
        row.appendChild(emojisContainer);
        
        return row;
    }
    
    // Reset current guess
    function resetCurrentGuess() {
        currentGuess = Array(CODE_LENGTH).fill(null);
        
        guessSlots.forEach(slot => {
            slot.textContent = '';
            slot.classList.remove('filled');
        });
        
        submitBtn.disabled = true;
    }
    
    // Update guesses counter
    function updateGuessesCounter() {
        guessesCounter.textContent = `${guessHistory.length}/${MAX_GUESSES}`;
    }
    
    // Copy text to clipboard
    function copyToClipboard(text) {
        // Try using the Clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    console.log('Text copied to clipboard');
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    fallbackCopyToClipboard(text);
                });
        } else {
            fallbackCopyToClipboard(text);
        }
    }
    
    function fallbackCopyToClipboard(text) {
        // Fallback for browsers that don't support Clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            const msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text was ' + msg);
        } catch (err) {
            console.error('Fallback: Unable to copy', err);
        }
        
        document.body.removeChild(textArea);
    }
    
    // Enhanced mobile experience for iOS Safari
    function enhanceMobileExperience() {
        // Fix for iOS Safari viewport height issues
        function setViewportHeight() {
            // Set a CSS variable with the viewport height
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        }
        
        // Set initial height and update on resize
        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 300);
        });
    }
    
    // Modal functions
    function showRulesModal() {
        // Create modal container
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = 'HOW TO PLAY';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.textContent = '×';
        closeButton.onclick = closeModal;
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Modal content with updated rules
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        modalContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <p style="font-weight: bold; font-size: 1.1rem;">Guess the 5-emoji code in 6 tries</p>
            </div>
            
            <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                <div style="display: flex; gap: 4px;">
                    <div class="guess-emoji" style="width: 32px; height: 32px; font-size: 18px;">🍎</div>
                    <div class="guess-emoji" style="width: 32px; height: 32px; font-size: 18px;">🐱</div>
                    <div class="guess-emoji" style="width: 32px; height: 32px; font-size: 18px;">🍌</div>
                    <div class="guess-emoji" style="width: 32px; height: 32px; font-size: 18px;">🚀</div>
                    <div class="guess-emoji" style="width: 32px; height: 32px; font-size: 18px;">🐶</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <p style="margin-bottom: 10px; font-weight: bold;">After each guess:</p>
                
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div class="guess-emoji guess-emoji-green" style="width: 32px; height: 32px; font-size: 18px; margin-right: 10px;">🍎</div>
                    <p>Green = correct spot</p>
                </div>
                
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div class="guess-emoji guess-emoji-yellow" style="width: 32px; height: 32px; font-size: 18px; margin-right: 10px;">🍌</div>
                    <p>Yellow = wrong spot</p>
                </div>
                
                <div style="display: flex; align-items: center;">
                    <div class="guess-emoji guess-emoji-grey" style="width: 32px; height: 32px; font-size: 18px; margin-right: 10px;">🌈</div>
                    <p>Grey = not in code</p>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <p style="margin-bottom: 10px; font-weight: bold;">Example:</p>
                
                <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                    <div class="guess-emoji guess-emoji-green" style="width: 32px; height: 32px; font-size: 18px;">🍎</div>
                    <div class="guess-emoji guess-emoji-grey" style="width: 32px; height: 32px; font-size: 18px;">🌈</div>
                    <div class="guess-emoji guess-emoji-yellow" style="width: 32px; height: 32px; font-size: 18px;">🐱</div>
                    <div class="guess-emoji guess-emoji-grey" style="width: 32px; height: 32px; font-size: 18px;">🌙</div>
                    <div class="guess-emoji guess-emoji-grey" style="width: 32px; height: 32px; font-size: 18px;">🔮</div>
                </div>
                
                <p style="font-size: 0.9rem;">
                    • 🍎 is in the correct position<br>
                    • 🐱 is in the code but wrong position<br>
                    • Other emojis are not in the code
                </p>
            </div>
        `;
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        
        const playButton = document.createElement('button');
        playButton.className = 'modal-play-button';
        playButton.textContent = 'PLAY';
        playButton.onclick = closeModal;
        
        modalFooter.appendChild(playButton);
        
        // Assemble modal
        modalContainer.appendChild(modalHeader);
        modalContainer.appendChild(modalContent);
        modalContainer.appendChild(modalFooter);
        modalOverlay.appendChild(modalContainer);
        
        document.body.appendChild(modalOverlay);
        
        // Prevent scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }
    
    function showHowToPlayModal() {
        // Similar to showRulesModal but can be called from "how to play" button
        showRulesModal();
    }
    
    function generateShareText(isWon) {
        const formattedDate = getFormattedDate();
        let shareText = `Mojimind: ${formattedDate}\n`;
        
        // Add emoji grid representation of guesses
        if (isWon) {
            // Add number of guesses out of max with star emoji for visual appeal
            shareText += `${guessHistory.length}/${MAX_GUESSES} ⭐\n\n`;
            
            // Create a visual representation of the game with Wordle-style squares
            for (let i = 0; i < guessHistory.length; i++) {
                const guess = guessHistory[i];
                
                // Add a row of squares for each guess
                // 🟩 = green (correct position)
                // 🟨 = yellow (correct emoji, wrong position)
                // ⬛ = grey (not in code)
                
                let feedbackRow = '';
                
                for (let j = 0; j < CODE_LENGTH; j++) {
                    if (guess.feedback[j] === 'green') {
                        feedbackRow += '🟩';
                    } else if (guess.feedback[j] === 'yellow') {
                        feedbackRow += '🟨';
                    } else {
                        feedbackRow += '⬛';
                    }
                }
                
                // Add guess number for context
                shareText += `${i+1}. ${feedbackRow}\n`;
            }
            
            // Add a celebratory message based on performance
            if (guessHistory.length <= 5) {
                shareText += "\nBrilliant! 🎯";
            } else if (guessHistory.length <= 10) {
                shareText += "\nWell done! 👏";
            } else if (guessHistory.length <= 15) {
                shareText += "\nGood job! 👍";
            } else {
                shareText += "\nPhew! Made it! 😅";
            }
        } else {
            shareText += `X/${MAX_GUESSES} 💔\n\n`;
            
            // For lost games, show all attempts with Wordle-style squares
            for (let i = 0; i < guessHistory.length; i++) {
                const guess = guessHistory[i];
                
                let feedbackRow = '';
                
                for (let j = 0; j < CODE_LENGTH; j++) {
                    if (guess.feedback[j] === 'green') {
                        feedbackRow += '🟩';
                    } else if (guess.feedback[j] === 'yellow') {
                        feedbackRow += '🟨';
                    } else {
                        feedbackRow += '⬛';
                    }
                }
                
                // Add guess number for context
                shareText += `${i+1}. ${feedbackRow}\n`;
            }
            
            shareText += "\nBetter luck tomorrow! 🍀";
        }
        
        // Add URL
        shareText += '\n\nhttps://mojimind.com';
        
        return shareText;
    }
    
    function showCompletionModal(isWon) {
        // Create modal container
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header completion-modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = isWon ? 'Puzzle Solved!' : 'Game Over';
        modalTitle.className = isWon ? 'success-title' : '';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.textContent = '×';
        closeButton.onclick = closeModal;
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Create result message
        let resultMessage = '';
        if (isWon) {
            // Add different messages based on performance
            if (guessHistory.length <= 5) {
                resultMessage = `Amazing! You solved today's mojimind in just ${guessHistory.length} guesses!`;
            } else if (guessHistory.length <= 10) {
                resultMessage = `Great job! You solved today's mojimind in ${guessHistory.length} guesses!`;
            } else if (guessHistory.length <= 15) {
                resultMessage = `Well done! You solved today's mojimind in ${guessHistory.length} guesses.`;
            } else {
                resultMessage = `You solved today's mojimind in ${guessHistory.length} guesses. Phew!`;
            }
        } else {
            resultMessage = `Better luck next time! The code was:`;
        }
        
        // Generate share text with visual representation
        const shareText = generateShareText(isWon);
        
        // Configure message text
        const messageText = document.createElement('p');
        messageText.className = 'result-message';
        messageText.textContent = resultMessage;
        
        // Create share preview
        const sharePreview = document.createElement('div');
        sharePreview.className = 'share-preview';
        
        // Display the visual representation of guesses
        const shareLines = shareText.split('\n');
        
        // Add title line
        const titleLine = document.createElement('div');
        titleLine.className = 'share-line share-title';
        titleLine.textContent = shareLines[0]; // "Mojimind: YYYY-MM-DD"
        sharePreview.appendChild(titleLine);
        
        // Add score line
        const scoreLine = document.createElement('div');
        scoreLine.className = 'share-line share-score';
        scoreLine.textContent = shareLines[1]; // "X/20 ⭐" or "X/20 💔"
        sharePreview.appendChild(scoreLine);
        
        // Add spacer
        const spacer = document.createElement('div');
        spacer.className = 'share-spacer';
        sharePreview.appendChild(spacer);
        
        // Add guess lines (skip header, score, empty line, and footer)
        for (let i = 3; i < shareLines.length - 3; i++) {
            if (shareLines[i].trim() !== '') {
                const shareLine = document.createElement('div');
                shareLine.className = 'share-line';
                shareLine.textContent = shareLines[i];
                sharePreview.appendChild(shareLine);
            }
        }
        
        // Add message line if present (celebratory or better luck message)
        if (shareLines[shareLines.length - 3].trim() !== '') {
            const messageLine = document.createElement('div');
            messageLine.className = 'share-line share-message';
            messageLine.textContent = shareLines[shareLines.length - 3];
            sharePreview.appendChild(messageLine);
        }
        
        // Create share button
        const shareButton = document.createElement('button');
        shareButton.textContent = 'SHARE RESULTS';
        shareButton.className = 'share-button';
        shareButton.onclick = function() {
            copyToClipboard(shareText);
            const originalText = this.textContent;
            this.textContent = 'COPIED!';
            setTimeout(() => {
                this.textContent = originalText;
            }, 2000);
        };
        
        // Add message to content
        modalContent.appendChild(messageText);
        
        // If game was lost, show the secret code
        if (!isWon) {
            const codeReveal = document.createElement('div');
            codeReveal.style.display = 'flex';
            codeReveal.style.justifyContent = 'center';
            codeReveal.style.gap = '8px';
            codeReveal.style.margin = '20px 0';
            
            secretCode.forEach(emoji => {
                const emojiElement = document.createElement('div');
                emojiElement.classList.add('guess-emoji');
                emojiElement.style.width = '40px';
                emojiElement.style.height = '40px';
                emojiElement.textContent = emoji;
                codeReveal.appendChild(emojiElement);
            });
            
            modalContent.appendChild(codeReveal);
        }
        
        // Add share preview and button
        modalContent.appendChild(sharePreview);
        modalContent.appendChild(shareButton);
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        
        const closeModalButton = document.createElement('button');
        closeModalButton.className = 'modal-play-button';
        closeModalButton.textContent = 'CLOSE';
        closeModalButton.onclick = closeModal;
        
        modalFooter.appendChild(closeModalButton);
        
        // Assemble modal
        modalContainer.appendChild(modalHeader);
        modalContainer.appendChild(modalContent);
        modalContainer.appendChild(modalFooter);
        modalOverlay.appendChild(modalContainer);
        
        document.body.appendChild(modalOverlay);
        
        // Prevent scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            // Add closing animation
            modalOverlay.classList.add('closing');
            
            // Wait for animation to complete before removing
            setTimeout(() => {
                document.body.removeChild(modalOverlay);
                document.body.style.overflow = '';
            }, 300);
        }
    }
    
    // Add click events to guess slots
    guessSlots.forEach(slot => {
        slot.addEventListener('click', handleSlotClick);
    });
    
    // Submit button
    submitBtn.addEventListener('click', submitGuess);
    
    // How to play button
    howToPlayButton.addEventListener('click', function(e) {
        e.preventDefault();
        showHowToPlayModal();
    });
    
    // Fix for emoji buttons to prevent them from staying in the active state on mobile
    document.addEventListener('touchend', function(e) {
        const emojiKey = e.target.closest('.emoji-key');
        if (emojiKey) {
            // Force remove any active/hover states on touch end
            setTimeout(() => {
                emojiKey.blur();
            }, 100);
        }
    });
    
    // Call enhanced mobile experience
    enhanceMobileExperience();
    
    // Initialize game
    initGame();
  });