import { useRef, VFC, useEffect, useState } from "react";
import * as THREE from "three";
import { Circle, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";

import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
interface IPosition {
  x: number;
  y: number;
}
const videoSize = { width: 640, height: 480 };

async function loadModel() {
  const model = handPoseDetection.SupportedModels.MediaPipeHands;
  const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
    runtime: "mediapipe",
    modelType: "full",
    maxHands: 1,
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
  };

  const detector = await handPoseDetection.createDetector(
    model,
    detectorConfig
  );
  return detector;
}

async function setupCamera() {
  const video = document.createElement("video");
  video.playsInline = true;
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  return new Promise<HTMLVideoElement>((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function estimateHandPose(video: HTMLVideoElement, detector: any) {
  const hands = await detector.estimateHands(video);
  return hands;
}

const scaleToScreen = (pos: IPosition): IPosition => {
  return {
    x: (window.innerWidth / videoSize.width) * pos.x,
    y: (window.innerHeight / videoSize.height) * pos.y,
  };
};

export const Lense: VFC = () => {
  const ref = useRef<THREE.Mesh>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const texture = useTexture(
    process.env.PUBLIC_URL + "/assets/textures/lense.png"
  );
  const { aspect } = useThree(({ viewport }) => viewport);

  //   useEffect(() => {
  //     const target = new THREE.Vector3();
  //     const updatePosition = () => {
  //       target.set(mouse.x, pointer.y, 0.01);
  //       ref.current!.position.lerp(target, 0.1);
  //     };

  //     const frameId = requestAnimationFrame(updatePosition);

  //     return () => {
  //       cancelAnimationFrame(frameId);
  //     };
  //   }, [pointer]);
  const target = new THREE.Vector3();
  useFrame(({ mouse }) => {
    target.set(mouse.x, mouse.y, 0.01);
    ref.current!.position.lerp(target, 0.1);
  });

  useEffect(() => {
    const bindPage = async () => {
      const video = await setupCamera();
      video.play();

      const detector = await loadModel();
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      document.body.appendChild(canvas);

      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

      const renderPrediction = async () => {
        const hands = await estimateHandPose(video, detector);

        ctx.clearRect(0, 0, video.width, video.height);

        if (hands !== undefined && hands.length > 0) {
          hands.forEach((hand: any) => {
            const point = hand.keypoints[12]; //middle_finger_tip
            if (point) {
              const scaledPoint = scaleToScreen(point);
              console.log(scaledPoint);
              setPointer(scaledPoint);
            }
          });
        }

        requestAnimationFrame(renderPrediction);
      };

      renderPrediction();
    };

    bindPage();
  }, []);

  return (
    <Circle
      ref={ref}
      args={[0.23, 50]}
      position-z={0.01}
      scale={[1 / aspect, 1, 1]}
    >
      <meshBasicMaterial map={texture} transparent />
    </Circle>
  );
};
