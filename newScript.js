// Ensure you have included the face-api.js library in your HTML

// Initialize the video element and spans for displaying information
const video = document.getElementById("video");
const spans = document.getElementsByTagName("span");

// Load the models from the specified URI
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
  await faceapi.nets.faceExpressionNet.loadFromUri("/models");
  console.log("Models loaded");
}

// Start the video stream from the webcam
async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
  } catch (error) {
    console.error("Error accessing the webcam", error);
  }
}

// Analyze face features with modifications for nearest face and multiple detections
function analyzeFaceFeatures(detections) {
  if (detections.length > 1) {
    alert("2 or more faces detected. Focusing on the nearest.");
  }

  // Sort detections by face area (width * height), assuming larger faces are closer
  const sortedDetections = detections.sort((a, b) => {
    const aArea = a.detection.box.width * a.detection.box.height;
    const bArea = b.detection.box.width * b.detection.box.height;
    return bArea - aArea;
  });

  // Focus on the first detection after sorting (nearest face)
  const detection = sortedDetections[0];
  if (detection) {
    const landmarks = detection.landmarks;
    const jawOutline = landmarks.getJawOutline();
    const nose = landmarks.getNose();

    const faceTilt = detectFaceTilt(jawOutline);
    const faceOrientation = detectFaceOrientation(jawOutline, nose);
    const mouthStatus = detectMouthStatus(landmarks.getMouth());

    spans[0].innerHTML = `Detected Faces: ${detections.length}`;
    spans[1].innerHTML = `Face-Tilt: ${faceTilt}`;
    spans[2].innerHTML = `Face-Orientation: ${faceOrientation}`;
    spans[3].innerHTML = `Mouth: ${mouthStatus}`;

    console.log(
      `Nearest Face: Tilt - ${faceTilt}, Orientation - ${faceOrientation}, Mouth - ${mouthStatus}`
    );
  }
}

// Existing helper functions: detectFaceTilt, detectFaceOrientation, detectMouthStatus remain unchanged

function detectFaceTilt(jawOutline) {
  const leftSide = jawOutline.slice(0, 8);
  const rightSide = jawOutline.slice(8, 17);
  const leftY = leftSide.reduce((acc, p) => acc + p.y, 0) / leftSide.length;
  const rightY = rightSide.reduce((acc, p) => acc + p.y, 0) / rightSide.length;

  if (Math.abs(leftY - rightY) < 30) {
    // Tweak this threshold as needed
    return "Forward";
  }
  return leftY > rightY ? "Right Tilt" : "Left Tilt";
}

function detectFaceOrientation(jawOutline, nose) {
  const jawLeftPoint = jawOutline[0];
  const jawRightPoint = jawOutline[jawOutline.length - 1];
  const nosePoint = nose[3]; // Using a central nose point

  const noseToLeftJawDistance = Math.abs(nosePoint.x - jawLeftPoint.x);
  const noseToRightJawDistance = Math.abs(nosePoint.x - jawRightPoint.x);
  const totalJawWidth = Math.abs(jawLeftPoint.x - jawRightPoint.x);

  turnRatioThreshold = 0.7; // Adjust based on your needs
  leftRatio = noseToLeftJawDistance / totalJawWidth;
  rightRatio = noseToRightJawDistance / totalJawWidth;

  if (leftRatio > turnRatioThreshold) {
    return "Facing Left";
  } else if (rightRatio > turnRatioThreshold) {
    return "Facing Right";
  } else {
    return "Facing Forward";
  }
}

function detectMouthStatus(mouth) {
  const topLip = mouth[13].y; // Top lip bottom point
  const bottomLip = mouth[19].y; // Bottom lip top point
  const mouthOpenThreshold = 10; // Adjust based on your needs
  return bottomLip - topLip > mouthOpenThreshold ? "Open" : "Closed";
}

// Detect faces, modified to focus on the nearest face
async function detectFaces() {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    analyzeFaceFeatures(resizedDetections);
  }, 100);
}

// Main function to run the application
async function run() {
  await loadModels();
  await startVideo();
  video.onplay = () => {
    detectFaces();
  };
}

run();
