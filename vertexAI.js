const { VertexAI } = require('@google-cloud/vertexai');
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const path = require('path');
const fs = require('fs');

// Initialize Vertex AI
const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: 'us-central1',
});

// Initialize Video Intelligence client
const videoIntelligenceClient = new VideoIntelligenceServiceClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Function to analyze video using Google's Video Intelligence API
async function analyzeVideo(videoPath) {
    try {
        console.log(`Analyzing video: ${videoPath}`);

        // Read file content
        const videoFile = fs.readFileSync(videoPath);
        const videoBytes = videoFile.toString('base64');

        // Configure the request
        const request = {
            inputContent: videoBytes,
            features: ['LABEL_DETECTION', 'OBJECT_TRACKING', 'PERSON_DETECTION'],
            videoContext: {
                speechTranscriptionConfig: {
                    languageCode: 'en-US',
                    enableAutomaticPunctuation: true,
                },
            },
        };

        // Make API call
        const [operation] = await videoIntelligenceClient.annotateVideo(request);
        console.log('Video analysis in progress...');

        // Wait for operation to complete
        const [operationResult] = await operation.promise();

        // Process results
        const { annotationResults } = operationResult;
        const result = annotationResults[0];

        // Extract relevant information for emergency scenarios
        const analysis = {
            labels: [],
            objects: [],
            persons: [],
            transcript: '',
            emergencyAssessment: '',
        };

        // Process labels
        if (result.segmentLabelAnnotations) {
            analysis.labels = result.segmentLabelAnnotations
                .map(label => ({
                    description: label.entity.description,
                    confidence: label.segments[0]?.confidence || 0
                }))
                .filter(label => label.confidence > 0.7); // Only include high confidence labels
        }

        // Process objects
        if (result.objectAnnotations) {
            analysis.objects = result.objectAnnotations
                .map(obj => ({
                    name: obj.entity.description,
                    confidence: obj.frames[0]?.confidence || 0
                }))
                .filter(obj => obj.confidence > 0.7);
        }

        // Process persons
        if (result.personDetectionAnnotations) {
            analysis.persons = result.personDetectionAnnotations.length;
        }

        // Process speech transcription if available
        if (result.speechTranscriptions) {
            analysis.transcript = result.speechTranscriptions
                .flatMap(transcription =>
                    transcription.alternatives.map(alt => alt.transcript)
                )
                .join(' ');
        }

        // Generate emergency assessment based on detected elements
        analysis.emergencyAssessment = generateEmergencyAssessment(analysis);

        console.log('Video analysis completed');
        return analysis;
    } catch (error) {
        console.error('Error in video analysis:', error);
        throw new Error(`Failed to analyze video: ${error.message}`);
    }
}

// Function to generate emergency assessment based on detected elements
function generateEmergencyAssessment(analysis) {
    // Look for emergency indicators in labels and objects
    const emergencyKeywords = [
        'blood', 'injury', 'accident', 'fire', 'smoke', 'unconscious',
        'fall', 'burn', 'wound', 'seizure', 'collapse', 'emergency',
        'pain', 'choking', 'bleeding'
    ];

    const detectedKeywords = [];

    // Check labels
    analysis.labels.forEach(label => {
        emergencyKeywords.forEach(keyword => {
            if (label.description.toLowerCase().includes(keyword)) {
                detectedKeywords.push(keyword);
            }
        });
    });

    // Check objects
    analysis.objects.forEach(obj => {
        emergencyKeywords.forEach(keyword => {
            if (obj.name.toLowerCase().includes(keyword)) {
                detectedKeywords.push(keyword);
            }
        });
    });

    // Check transcript
    if (analysis.transcript) {
        emergencyKeywords.forEach(keyword => {
            if (analysis.transcript.toLowerCase().includes(keyword)) {
                detectedKeywords.push(keyword);
            }
        });
    }

    // Remove duplicates
    const uniqueKeywords = [...new Set(detectedKeywords)];

    if (uniqueKeywords.length > 0) {
        return `Potential emergency detected involving: ${uniqueKeywords.join(', ')}. Analysis is based on visual elements and speech in the video.`;
    } else {
        return 'No clear emergency indicators detected. Please provide more information.';
    }
}

module.exports = { analyzeVideo };