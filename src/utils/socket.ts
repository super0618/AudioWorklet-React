import { io } from "socket.io-client";

const SERVER_ADDR = "https://sarcofag.com/audio";

const socket = io(SERVER_ADDR);

export default socket;
