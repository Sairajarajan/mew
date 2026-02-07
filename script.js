class FaceDetectorApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.facesContainer = document.getElementById('facesContainer');
        this.status = document.getElementById('status');
        
        // Buttons
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.captureBtn = document.getElementById('captureBtn');
        
        // Variables
        this.stream = null;
        this.detector = null;
        this.isDetecting = false;
        this.detectionInterval = null;
        
        // Event listeners
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.captureFaces());
        
        this.initializeFaceDetection();
    }
    
    async initializeFaceDetection() {
        try {
            this.status.textContent = 'Loading face detection model...';
            
            // Initialize TensorFlow.js backend
            await tf.setBackend('webgl');
            
            // Load face detection model
            const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
            const detectorConfig = {
                runtime: 'tfjs',
                maxFaces: 20,
                detectorModelUrl: 'https://tfhub.dev/mediapipe/tfjs-model/face_detection/short/1'
            };
            
            this.detector = await faceDetection.createDetector(model, detectorConfig);
            this.status.textContent = 'Model loaded successfully!';
            this.startBtn.disabled = false;
            
        } catch (error) {
            console.error('Error initializing face detection:', error);
            this.status.textContent = 'Error loading model. Please refresh the page.';
        }
    }
    
    async startCamera() {
        try {
            this.status.textContent = 'Accessing camera...';
            
            // Get user media with constraints optimized for mobile
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });
            
            this.video.srcObject = this.stream;
            this.video.play();
            
            // Set canvas dimensions to match video
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            };
            
            // Update UI
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.captureBtn.disabled = false;
            this.status.textContent = 'Camera started. Point at people to detect faces.';
            
            // Start face detection
            this.startFaceDetection();
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.status.textContent = 'Error accessing camera. Please ensure camera permissions are granted.';
            
            // For testing on desktop without camera
            if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                this.loadSampleVideo();
            }
        }
    }
    
    loadSampleVideo() {
        // Fallback for testing without camera
        this.video.src = 'https://media.gettyimages.com/id/527909290/video/portrait-of-happy-diverse-group-of-friends-smiling-at-camera.mp4?s=640x640&k=20&c=WKj0P-GkLmdDc9BP2hQHEnVqVv1pJmOKRZgPVYyryz8=';
        this.video.loop = true;
        this.video.muted = true;
        this.video.play();
        
        this.video.onloadeddata = () => {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.captureBtn.disabled = false;
            this.status.textContent = 'Using sample video. Click "Capture Faces" to detect faces.';
        };
    }
    
    async startFaceDetection() {
        if (this.isDetecting) return;
        
        this.isDetecting = true;
        
        // Run face detection periodically
        this.detectionInterval = setInterval(async () => {
            if (this.video.readyState !== 4) return;
            
            try {
                const faces = await this.detector.estimateFaces(this.video);
                
                // Draw video frame
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                
                // Draw face bounding boxes
                if (faces.length > 0) {
                    faces.forEach(face => {
                        this.drawFaceBox(face);
                    });
                    
                    // Update status with face count
                    this.status.textContent = `Detected ${faces.length} face${faces.length !== 1 ? 's' : ''}`;
                }
                
            } catch (error) {
                console.error('Error detecting faces:', error);
            }
        }, 100); // Run detection every 100ms
    }
    
    drawFaceBox(face) {
        const { box } = face;
        
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
            box.xMin, 
            box.yMin, 
            box.width, 
            box.height
        );
        
        // Draw label
        this.ctx.fillStyle = '#00FF00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(
            `Face ${Math.round(100 * (face.box.xMin / this.canvas.width))}`,
            box.xMin,
            box.yMin > 20 ? box.yMin - 5 : box.yMin + 20
        );
    }
    
    async captureFaces() {
        this.status.textContent = 'Capturing faces...';
        
        try {
            const faces = await this.detector.estimateFaces(this.video);
            
            if (faces.length === 0) {
                this.status.textContent = 'No faces detected. Try again.';
                return;
            }
            
            // Clear previous faces
            this.facesContainer.innerHTML = '';
            
            // Extract and display each face
            faces.forEach((face, index) => {
                this.extractAndDisplayFace(face, index + 1);
            });
            
            this.status.textContent = `Captured ${faces.length} face${faces.length !== 1 ? 's' : ''}`;
            
        } catch (error) {
            console.error('Error capturing faces:', error);
            this.status.textContent = 'Error capturing faces. Please try again.';
        }
    }
    
    extractAndDisplayFace(face, index) {
        const { box } = face;
        
        // Create canvas for face extraction
        const faceCanvas = document.createElement('canvas');
        const faceCtx = faceCanvas.getContext('2d');
        
        // Set canvas size to face dimensions with some padding
        const padding = 20;
        faceCanvas.width = box.width + padding * 2;
        faceCanvas.height = box.height + padding * 2;
        
        // Draw face with padding
        faceCtx.drawImage(
            this.video,
            box.xMin, box.yMin, box.width, box.height,
            padding, padding, box.width, box.height
        );
        
        // Create face card
        const faceCard = document.createElement('div');
        faceCard.className = 'face-card';
        
        // Add face image
        const img = document.createElement('img');
        img.src = faceCanvas.toDataURL('image/jpeg', 0.8);
        img.alt = `Face ${index}`;
        
        // Add label
        const label = document.createElement('span');
        label.textContent = `Face ${index}`;
        
        // Assemble card
        faceCard.appendChild(img);
        faceCard.appendChild(label);
        this.facesContainer.appendChild(faceCard);
    }
    
    stopCamera() {
        // Clear detection interval
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        this.isDetecting = false;
        
        // Stop video stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Reset video element
        this.video.srcObject = null;
        this.video.src = '';
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update UI
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.captureBtn.disabled = true;
        this.status.textContent = 'Camera stopped. Click "Start Camera" to begin again.';
    }
}

// Initialize app when page loads
window.addEventListener('DOMContentLoaded', () => {
    new FaceDetectorApp();
});