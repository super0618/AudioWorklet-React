export const convert32To16Base64String = (input: Float32Array) => {
	const reader1 = new FileReader();
	reader1.readAsDataURL(new Blob([float32ToInt16(input)], { type: "audio/l16" }));

	return new Promise<string>((resolve) => {
		reader1.onloadend = function () {
			const result: string = reader1?.result as string;
			resolve(result.split(",")[1]);
		};
	});
};

export const float32ToInt16 = (input: Float32Array): Int16Array => {
	const out = new Int16Array(input.length);
	for (let i = 0; i < input.length; i++) {
		const s = Math.max(-1, Math.min(1, input[i]));
		out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
	}
	return out;
};
