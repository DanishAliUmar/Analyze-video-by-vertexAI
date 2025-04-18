document.addEventListener('DOMContentLoaded', () => {
    const analysisForm = document.getElementById('analysis-form');
    const videoInput = document.getElementById('video');
    const videoPreview = document.getElementById('preview');
    const analyzeBtn = document.querySelector('.analyze-btn');
    const loadingIndicator = document.querySelector('.loading-indicator');
    const resultsSection = document.querySelector('.results-section');
    const errorSection = document.querySelector('.error-section');
    const errorText = document.getElementById('error-text');

    // Show video preview when a file is selected
    if (videoInput && videoPreview) {
        videoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];

            if (file) {
                const fileURL = URL.createObjectURL(file);
                videoPreview.src = fileURL;
                videoPreview.style.display = 'block';

                // Check video duration after metadata is loaded
                videoPreview.onloadedmetadata = () => {
                    if (videoPreview.duration > 30) {
                        alert('Please upload a video shorter than 30 seconds.');
                        videoInput.value = '';
                        videoPreview.src = '';
                        videoPreview.style.display = 'none';
                    }
                };
            } else {
                videoPreview.src = '';
                videoPreview.style.display = 'none';
            }
        });
    }

    // Handle form submission
    if (analysisForm) {
        analysisForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Hide previous results and errors
            resultsSection.style.display = 'none';
            errorSection.style.display = 'none';

            // Show loading indicator
            loadingIndicator.style.display = 'block';

            // Disable the analyze button
            analyzeBtn.textContent = 'Analyzing...';
            analyzeBtn.disabled = true;

            try {
                const formData = new FormData(analysisForm);

                // Send request to backend
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to analyze video');
                }

                if (data.success && data.analysis) {
                    displayResults(data.analysis);
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (error) {
                // Show error message
                errorText.textContent = error.message;
                errorSection.style.display = 'block';
            } finally {
                // Hide loading indicator
                loadingIndicator.style.display = 'none';

                // Re-enable the analyze button
                analyzeBtn.textContent = 'Analyze Emergency';
                analyzeBtn.disabled = false;
            }
        });
    }

    // Function to display analysis results
    function displayResults(analysis) {
        // Emergency assessment
        document.getElementById('emergency-assessment').textContent = analysis.emergencyAssessment;

        // Transcript
        const transcriptSection = document.querySelector('.transcript');
        if (analysis.transcript) {
            document.getElementById('transcript-text').textContent = analysis.transcript;
            transcriptSection.style.display = 'block';
        } else {
            transcriptSection.style.display = 'none';
        }

        // Labels
        const labelsSection = document.querySelector('.labels');
        const labelsList = document.getElementById('labels-list');
        labelsList.innerHTML = '';

        if (analysis.labels && analysis.labels.length > 0) {
            analysis.labels.forEach(label => {
                const li = document.createElement('li');
                li.textContent = `${label.description} (${Math.round(label.confidence * 100)}% confidence)`;
                labelsList.appendChild(li);
            });
            labelsSection.style.display = 'block';
        } else {
            labelsSection.style.display = 'none';
        }

        // Objects
        const objectsSection = document.querySelector('.objects');
        const objectsList = document.getElementById('objects-list');
        objectsList.innerHTML = '';

        if (analysis.objects && analysis.objects.length > 0) {
            analysis.objects.forEach(obj => {
                const li = document.createElement('li');
                li.textContent = `${obj.name} (${Math.round(obj.confidence * 100)}% confidence)`;
                objectsList.appendChild(li);
            });
            objectsSection.style.display = 'block';
        } else {
            objectsSection.style.display = 'none';
        }

        // Persons
        const personsSection = document.querySelector('.persons');
        if (analysis.persons) {
            document.getElementById('persons-count').textContent = `${analysis.persons} person(s) in the video`;
            personsSection.style.display = 'block';
        } else {
            personsSection.style.display = 'none';
        }

        // Show results section
        resultsSection.style.display = 'block';

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
});