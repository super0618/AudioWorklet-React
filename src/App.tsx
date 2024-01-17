import { useEffect, useState } from "react";
import socket from "./utils/socket";
import { convert32To16Base64String } from "./utils/functions";

const chunks: string[] = [];
var recordingUniqueId: string = "";
var curIndex: number = 0;

interface TranscriptType {
	actor: string;
	end: number;
	start: number;
	state: string;
	text: string;
}

export default function App() {
	const [transcripts, setTranscripts] = useState<TranscriptType[]>([]);
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
		try {
			const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

			const audioContext: AudioContext = new AudioContext({ sampleRate: 48000 });

			const sourceNode: MediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream);

			await audioContext.audioWorklet.addModule("recorder.worklet.js");

			const recorder: AudioWorkletNode = new AudioWorkletNode(audioContext, "recorder.worklet");

			sourceNode.connect(recorder).connect(audioContext.destination);

			recorder.port.onmessage = async (e: MessageEvent) => {
				const outputData: string = await convert32To16Base64String(e.data);

				chunks.push(outputData);
			};
		} catch (err: any) {
			console.log(err);
		}
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

		socket.on("audioDataChunkReceived", () => {
			sendAudioChunk(curIndex + 1, recordingUniqueId);
		});

		socket.on("transcription", (data: TranscriptType[]) => {
			console.log(data);
			setTranscripts(data);
		});
	}, []);

	return (
		<>
			<p>Socket: {socketStatus}</p>
			{transcripts.map((transcript: TranscriptType, index: number) => (
				<p key={index}>{transcript.text}</p>
			))}
		</>
	);
}
