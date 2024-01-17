import { useEffect, useState } from "react";
import socket from "./socket";
import { convert32To16Base64String } from "./utils/functions";
import "./App.css";

const chunks: string[] = [];
var recordingUniqueId: string = "";
var curIndex: number = 0;

export default function App() {
	const [transcripts, setTranscripts] = useState<any>([]);
	const [socketStatus, setSocketStatus] = useState<string>("disconnected");

	const sendAudioChunk = (index: number, rId: string) => {
		curIndex = index;
		recordingUniqueId = rId;
		socket.emit("audioDataChunk", {
			chunk: chunks[index],
			recordingUniqueId: rId,
			bufferSize: 8192,
			inputSampleRate: 48000,
			actor: "mic",
		});
	};

	const recordAudio = async () => {
		const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

		const audioContext: AudioContext = new AudioContext({ sampleRate: 48000 });

		const sourceNode: MediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream);

		const scriptNode: ScriptProcessorNode = audioContext.createScriptProcessor(8192, 1, 1); // buffer size, input channels, output channels

		sourceNode.connect(scriptNode).connect(audioContext.destination);

		scriptNode.onaudioprocess = async (e) => {
			const inputData: Float32Array = e.inputBuffer.getChannelData(0);

			const outputData: string = await convert32To16Base64String(inputData);

			chunks.push(outputData);
		};
	};

	useEffect(() => {
		socket.on("connect", () => {
			setSocketStatus("connected");
			socket.emit("startRecording", {
				inputSampleRate: 48000,
				chunkSize: 8192,
				actors: ["mic"],
			});
		});

		socket.on("connect_error", () => {
			setSocketStatus("connect_error");
		});

		socket.on("recordingIsReady", (data: any) => {
			recordAudio();
			setTimeout(() => {
				sendAudioChunk(0, data.recordingUniqueId);
			}, 1000);
		});

		socket.on("audioDataChunkReceived", (data: any) => {
			// console.log(curIndex + " -> " + data);
			sendAudioChunk(curIndex + 1, recordingUniqueId);
		});

		socket.on("transcription", (data: any) => {
			console.log(data);
			setTranscripts(data);
		});
	}, []);

	return (
		<>
			<p>Socket: {socketStatus}</p>
			{transcripts.map((transcript: any, index: number) => (
				<p key={index}>{transcript.text}</p>
			))}
		</>
	);
}
