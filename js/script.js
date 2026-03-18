document.addEventListener('DOMContentLoaded', () => {
    // Check compatibility
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // UI Elements
    const micBtn = document.getElementById('btn-mic');
    const resultText = document.getElementById('result-text');
    const languageSelect = document.getElementById('language-select');
    const btnCopy = document.getElementById('btn-copy');
    const btnDownload = document.getElementById('btn-download');
    const btnClear = document.getElementById('btn-clear');
    const recordingStatus = document.getElementById('recording-status');
    const recordingDot = document.getElementById('recording-dot');

    // State
    let isRecording = false;
    let finalTranscript = '';
    let interimTranscript = '';
    let isScriptEdit = false;
    let recognition = null;

    // Initialize Speech Recognition
    if ('SpeechRecognition' in window) {
        recognition = new window.SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        if (languageSelect.value) {
            recognition.lang = languageSelect.value;
        } else {
            recognition.lang = '';
        }

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('active');
            recordingDot.classList.add('listening');
            recordingStatus.textContent = 'جاري الاستماع...';

            finalTranscript = resultText.value;
            interimTranscript = '';
        };

        recognition.onresult = (event) => {
            let currentInterim = '';
            let newFinal = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    newFinal += transcript + ' ';
                } else {
                    currentInterim += transcript;
                }
            }

            // Add any newly finalized words to our main body of text
            if (newFinal.length > 0) {
                // Add a space ONLY if the existing transcript doesn't already have one
                if (finalTranscript.length > 0 && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n')) {
                    finalTranscript += ' ';
                }
                finalTranscript += newFinal;
            }
            interimTranscript = currentInterim;

            // To prevent resetting the user's cursor position when typing/pressing Enter,
            // we save the exact position the cursor is in right now.
            const start = resultText.selectionStart;
            const end = resultText.selectionEnd;
            const isFocused = document.activeElement === resultText;
            const wasAtEnd = (start >= resultText.value.length);

            // Set textarea value
            isScriptEdit = true;
            resultText.value = finalTranscript + interimTranscript;
            isScriptEdit = false;

            // Restore selection if focused to allow continuous typing/Enter smoothly
            if (isFocused) {
                // If they had the cursor precisely at the end, keep pushing it forward
                if (wasAtEnd) {
                    resultText.setSelectionRange(resultText.value.length, resultText.value.length);
                    resultText.scrollTop = resultText.scrollHeight;
                } else {
                    // Otherwise, they are typing somewhere else (or pressed enter somewhere else),
                    // so keep the cursor exactly where it was.
                    resultText.setSelectionRange(start, end);
                }
            } else {
                resultText.scrollTop = resultText.scrollHeight;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                recordingStatus.textContent = 'تم رفض الوصول للميكروفون';
                stopRecording();
            } else if (event.error === 'network') {
                recordingStatus.textContent = 'خطأ في الاتصال بالشبكة';
                stopRecording();
            } else if (event.error === 'aborted') {
                // Manually aborted for flushing, let onend handle the restart silently
            }
        };

        // When recognition stops (it does this occasionally or when user types over the interim)
        recognition.onend = () => {
            if (isRecording) {
                // Auto restart seamlessly
                try {
                    recognition.start();
                } catch (e) {
                    stopRecording();
                }
            } else {
                updateUIStateIdle();
            }
        };
    } else {
        recordingStatus.textContent = 'المتصفح لا يدعم تحويل الصوت إلى نص';
        recordingStatus.style.color = 'var(--danger)';
        micBtn.disabled = true;
        micBtn.style.opacity = '0.5';
        micBtn.style.cursor = 'not-allowed';
    }

    function toggleRecording() {
        if (!recognition) return;

        if (isRecording) {
            stopRecording();
        } else {
            try {
                if (languageSelect.value) {
                    recognition.lang = languageSelect.value;
                } else {
                    recognition.lang = '';
                }
                recognition.start();
            } catch (e) {
                console.error('Error starting recognition:', e);
            }
        }
    }

    function stopRecording() {
        isRecording = false;
        if (recognition) {
            recognition.stop();
        }
        updateUIStateIdle();
    }

    function updateUIStateIdle() {
        micBtn.classList.remove('active');
        recordingDot.classList.remove('listening');
        recordingStatus.textContent = 'انقر على الميكروفون للبدء';
    }

    // Event Listeners
    micBtn.addEventListener('click', toggleRecording);

    languageSelect.addEventListener('change', () => {
        if (isRecording) {
            stopRecording();
            setTimeout(() => {
                recordingStatus.textContent = 'تم تغيير اللغة، انقر للبدء';
            }, 300);
        }
    });

    // Smartly handle the user's manual keyboard edits (typing, backspacing, pressing Enter)
    resultText.addEventListener('input', () => {
        if (!isScriptEdit) {
            const val = resultText.value;
            // If they edited something before the interim text, subtract interim to get true final
            if (interimTranscript.length > 0 && val.endsWith(interimTranscript)) {
                finalTranscript = val.substring(0, val.length - interimTranscript.length);
            } else {
                // They either typed inside the interim text or hit Enter, 
                // so we accept the whole thing, solidify it, and restart recognition to flush it.
                finalTranscript = val;
                if (isRecording) {
                    recognition.abort();
                }
            }
        }
    });

    // Copy Text
    btnCopy.addEventListener('click', () => {
        if (!resultText.value) return;

        navigator.clipboard.writeText(resultText.value).then(() => {
            const icon = btnCopy.querySelector('i');
            icon.className = 'fa-solid fa-check';
            btnCopy.classList.add('success-flash');

            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                btnCopy.classList.remove('success-flash');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });

    // Clear Text
    btnClear.addEventListener('click', () => {
        finalTranscript = '';
        interimTranscript = '';
        resultText.value = '';
        resultText.focus();
    });

    // Download Text
    btnDownload.addEventListener('click', () => {
        if (!resultText.value) return;

        const blob = new Blob([resultText.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

        a.href = url;
        a.download = `VoiceWeaver_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    });

    // Toast notification function
    function showToast(message, iconClass = 'fa-solid fa-language') {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            toast.className = 'toast-container';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `<i class="${iconClass} toast-icon"></i><span>${message}</span>`;
        toast.classList.add('show');

        clearTimeout(toast.timeout);
        toast.timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Cycle language function
    function cycleLanguage() {
        if (!languageSelect) return;
        
        const nextIndex = (languageSelect.selectedIndex + 1) % languageSelect.options.length;
        languageSelect.selectedIndex = nextIndex;
        
        // Trigger the change event logic
        const event = new Event('change');
        languageSelect.dispatchEvent(event);
        
        const selectedText = languageSelect.options[nextIndex].text;
        showToast(`اللغة: ${selectedText}`);
    }

    // Keyboard shortcut listener
    window.addEventListener('keydown', (e) => {
        // Alt + L
        if (e.altKey && (e.key.toLowerCase() === 'n' || e.code === 'KeyL')) {
            e.preventDefault();
            cycleLanguage();
        }
    });
});
