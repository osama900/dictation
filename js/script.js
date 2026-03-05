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
    let recognition = null;
    
    // Initialize Speech Recognition
    if ('SpeechRecognition' in window) {
        recognition = new window.SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = languageSelect.value;
        
        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('active');
            recordingDot.classList.add('listening');
            recordingStatus.textContent = 'جاري الاستماع...';
            
            // Re-sync finalTranscript in case user typed directly into textarea
            finalTranscript = resultText.value;
            // Add a space if it's not empty and doesn't end with a space
            if (finalTranscript.length > 0 && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n')) {
                finalTranscript += ' ';
            }
        };
        
        recognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update textarea text
            resultText.value = finalTranscript + interimTranscript;
            // Scroll to bottom
            resultText.scrollTop = resultText.scrollHeight;
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                recordingStatus.textContent = 'تم رفض الوصول للميكروفون';
                stopRecording();
            } else if (event.error === 'network') {
                recordingStatus.textContent = 'خطأ في الاتصال بالشبكة';
                stopRecording();
            }
        };
        
        recognition.onend = () => {
            if (isRecording) {
                // If it stopped but we didn't tell it to (e.g., long pause), restart it
                try {
                    recognition.start();
                } catch (e) {
                    // Start failed, force stop UI
                    stopRecording();
                }
            } else {
                updateUIStateIdle();
            }
        };
    } else {
        // Not supported
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
                recognition.lang = languageSelect.value; // ensure language is updated
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
            stopRecording(); // Stop prior to changing language
            setTimeout(() => {
                recordingStatus.textContent = 'تم تغيير اللغة، انقر للبدء';
            }, 300);
        }
    });
    
    // Keep user's manual edits
    resultText.addEventListener('input', () => {
        if (!isRecording) {
            finalTranscript = resultText.value;
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
        resultText.value = '';
        resultText.focus();
    });
    
    // Download Text
    btnDownload.addEventListener('click', () => {
        if (!resultText.value) return;
        
        const blob = new Blob([resultText.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        // Generate filename based on date/time
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        
        a.href = url;
        a.download = `VoiceWeaver_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    });
});
