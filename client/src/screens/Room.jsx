import React, { useEffect, useCallback, useState, useRef } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const BlinkingDot = ({ isConnected }) => {
  const dotColor = isConnected ? 'green' : 'red';

  return (
    <span
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        backgroundColor: dotColor,
        borderRadius: '50%',
        animation: `${isConnected ? 'blinkGreen' : 'blinkRed'} 1s infinite`,
        marginLeft: '5px', // Adjust the spacing between text and dot
      }}
    />
  );
};

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  const playerRef = useRef(null);

  const capture = useCallback(() => {
    const player = playerRef?.current;

    if (player) {
      // Set the desired width and height for the canvas
      const canvasWidth = 160; // Adjust to your preference
      const canvasHeight = 90; // Adjust to your preference

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const context = canvas.getContext("2d");

      // Get the internal video element from the ReactPlayer component
      const videoElement = player.getInternalPlayer();

      // Draw the current frame onto the canvas with the new dimensions
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Get the data URL of the canvas
      const imageSrc = canvas.toDataURL("image/png");

      console.log(imageSrc);

      // Now you can save imageSrc to a JSON file or perform other actions
    }
  }, [playerRef]);

  // Schedule the capture function to run every 5 seconds
  setInterval(capture, 5000);


  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: '37px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)', fontFamily: 'Josefin Sans, sans-serif' }}>Room</h1>
          <h4 style={{ color: 'white', fontSize: '17px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)', fontFamily: 'Josefin Sans, sans-serif' }}>
            {remoteSocketId ? (
              <span>
                Connected <BlinkingDot isConnected={true} />
              </span>
            ) : (
              <span>
                Welcome, please wait <BlinkingDot isConnected={false} />
              </span>
            )}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '10px', gap:'10px' }}>
            {myStream && (
              <button onClick={sendStreams} className="button-36">
                Send Stream
              </button>
            )}

            {remoteSocketId && (
              <button onClick={handleCallUser}  class="button-45">
                Call
              </button>
            )}
          </div>
          {myStream && (
            <div style={{ position: 'absolute', bottom: "5%", zIndex: 1, right: '2%' }}>
              <h1 style={{ color: 'white', fontSize: '9px' }}>My Stream</h1>
              <center>
                <ReactPlayer
                  playing
                  muted
                  height="200px"
                  width="350px"
                  url={myStream}
                  style={{
                    borderRadius: '10px',
                    border: '4px solid #205AD0',
                    backgroundColor: '#fff',

                  }}
                />
              </center>
            </div>
          )}

          {remoteStream && (
            <div style={{ position: 'relative' }}>
              <h1 style={{ color: 'white', fontSize: '14px', padding: '5px' }}>Remote Stream</h1>
              <center>
                <ReactPlayer
                  ref={playerRef}
                  playing
                  muted={false}
                  height="520px"
                  width="940px"
                  url={remoteStream}
                  style={{
                    borderRadius: '10px',
                    border: '4px solid #205AD0',
                    backgroundColor: '#000000'
                  }}
                />
                {/* <button onClick={capture}>Capture</button> */}
              </center>
            </div>
          )}
        </div></div></>
  );
};

export default RoomPage;


