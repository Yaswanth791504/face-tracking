import * as handpose from "@tensorflow-models/handpose";
import * as faceapi from "face-api.js";
import React, { useEffect, useRef, useState } from "react";

const FaceDetectionComponent = () => {
  const videoRef = useRef(null);
  const [detectedFaces, setDetectedFaces] = useState(0);
  const [faceTilt, setFaceTilt] = useState("");
  const [faceOrientation, setFaceOrientation] = useState("");
  const [mouthStatus, setMouthStatus] = useState("");
  const [handRaised, setHandRaised] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        handpose.load(),
      ]);
      console.log("All models loaded");
    };

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        videoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Error accessing the webcam", error);
      }
    };

    loadModels().then(startVideo);
  }, []);

  useEffect(() => {
    let intervalId;

    const detectFeatures = async () => {
      if (!videoRef.current) return;

      const canvas = faceapi.createCanvasFromMedia(videoRef.current);
      document.body.append(canvas);
      const displaySize = {
        width: videoRef.current.width,
        height: videoRef.current.height,
      };
      faceapi.matchDimensions(canvas, displaySize);

      const handModel = await handpose.load();

      intervalId = setInterval(async () => {
        // Face detection and analysis
        const faceDetections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks();
        const resizedDetections = faceapi.resizeResults(
          faceDetections,
          displaySize
        );

        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        if (faceDetections[0]) {
          analyzeFaceFeatures(resizedDetections);
        }

        // Hand detection and analysis
        const handPredictions = await handModel.estimateHands(videoRef.current);
        if (handPredictions.length > 0) {
          // Simplified analysis to detect if any hand is raised
          // Adjust criteria based on your needs
          const isRaised = handPredictions.some(
            (hand) => hand.boundingBox.topLeft[1] < 200
          ); // Example condition
          setHandRaised(isRaised);
        }
      }, 100);
    };

    videoRef.current &&
      videoRef.current.addEventListener("play", detectFeatures);

    return () => {
      clearInterval(intervalId);
      videoRef.current &&
        videoRef.current.removeEventListener("play", detectFeatures);
    };
  }, []);

  const analyzeFaceFeatures = (resizedDetections) => {
    // Existing analysis logic here
    if (detections.length > 1) {
      alert("2 or more faces detected. Focusing on the nearest.");
    }

    const sortedDetections = detections.sort((a, b) => {
      const aArea = a.detection.box.width * a.detection.box.height;
      const bArea = b.detection.box.width * b.detection.box.height;
      return bArea - aArea;
    });

    const detection = sortedDetections[0];
    if (detection) {
      const landmarks = detection.landmarks;
      const jawOutline = landmarks.getJawOutline();
      const nose = landmarks.getNose();

      const faceTilt = detectFaceTilt(jawOutline);
      const faceOrientation = detectFaceOrientation(jawOutline, nose);
      const mouthStatus = detectMouthStatus(landmarks.getMouth());

      setDetectedFaces(detections.length);
      setFaceOrientation(faceOrientation);
      setFaceTilt(faceTilt);
      setMouthStatus(mouthStatus);

      console.log(
        `Nearest Face: Tilt - ${faceTilt}, Orientation - ${faceOrientation}, Mouth - ${mouthStatus}`
      );
    }
  };

  // Existing functions for face tilt, orientation, and mouth status
  function detectFaceTilt(jawOutline) {
    const leftSide = jawOutline.slice(0, 8);
    const rightSide = jawOutline.slice(8, 17);
    const leftY = leftSide.reduce((acc, p) => acc + p.y, 0) / leftSide.length;
    const rightY =
      rightSide.reduce((acc, p) => acc + p.y, 0) / rightSide.length;

    if (Math.abs(leftY - rightY) < 30) {
      return "Forward";
    }
    return leftY > rightY ? "Right Tilt" : "Left Tilt";
  }

  function detectFaceOrientation(jawOutline, nose) {
    const jawLeftPoint = jawOutline[0];
    const jawRightPoint = jawOutline[jawOutline.length - 1];
    const nosePoint = nose[3];

    const noseToLeftJawDistance = Math.abs(nosePoint.x - jawLeftPoint.x);
    const noseToRightJawDistance = Math.abs(nosePoint.x - jawRightPoint.x);
    const totalJawWidth = Math.abs(jawLeftPoint.x - jawRightPoint.x);

    const turnRatioThreshold = 0.7;
    const leftRatio = noseToLeftJawDistance / totalJawWidth;
    const rightRatio = noseToRightJawDistance / totalJawWidth;

    if (leftRatio > turnRatioThreshold) {
      return "Facing Left";
    } else if (rightRatio > turnRatioThreshold) {
      return "Facing Right";
    } else {
      return "Facing Forward";
    }
  }

  function detectMouthStatus(mouth) {
    const topLip = mouth[13].y;
    const bottomLip = mouth[19].y;
    const mouthOpenThreshold = 7;
    return bottomLip - topLip > mouthOpenThreshold ? "Open" : "Closed";
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          width: "720px",
        }}
      >
        <span>Detected Faces: {detectedFaces}</span>
        <span>Face-Tilt: {faceTilt}</span>
        <span>Face-Orientation: {faceOrientation}</span>
        <span>Mouth: {mouthStatus}</span>
        <span>Hand Raised: {handRaised ? "Yes" : "No"}</span>
      </div>
      <video
        ref={videoRef}
        width="720"
        height="560"
        autoPlay
        muted
        style={{ display: "block" }}
      ></video>
    </div>
  );
};

export default FaceDetectionComponent;
