import { DB } from "../supabase/Supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export const getUniqueID = () => {
  const date = new Date();
  // 16-digit ID
  const id =
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0") +
    date.getHours().toString().padStart(2, "0") +
    date.getMinutes().toString().padStart(2, "0") +
    date.getSeconds().toString().padStart(2, "0") +
    date.getMilliseconds().toString().substring(0, 2);

  return id;
};

export const getCurrentTime = () => {
  const date = new Date();
  // 07:57 PM
  const period = date.getHours() < 12 ? "AM" : "PM";
  const hours = date.getHours() % 12 || 12;
  const time =
    hours + ":" + date.getMinutes().toString().padStart(2, "0") + " " + period;
  return time;
};

export const formatMessageTime = (isoString: string) => {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export function generateRandomColor(transparency = 1) {
  // Generate random values for red, green, and blue channels
  const red = Math.floor(Math.random() * 256); // Random value between 0 and 255
  const green = Math.floor(Math.random() * 256); // Random value between 0 and 255
  const blue = Math.floor(Math.random() * 256); // Random value between 0 and 255

  // Ensure transparency value is within range [0, 1]
  transparency = Math.min(1, Math.max(0, transparency));

  // Construct the color string in RGBA format with the provided transparency
  const rgbaColor = `rgba(${red}, ${green}, ${blue}, ${transparency})`;

  return rgbaColor;
}

export const downlaodFile = async (url: string, fileName: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(new Blob([blob]));
    const linkElement = document.createElement("a");
    linkElement.href = blobUrl;
    linkElement.setAttribute("download", fileName);
    document.body.appendChild(linkElement);
    linkElement.click();
    linkElement.parentNode.removeChild(linkElement);
  } catch (e) {
    console.log(e);
  }
};

export const cropPhoto = (imageUrl: string) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Allow loading images from different origins
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const minSize = Math.min(img.width, img.height);
      const squareSize = 200;
      const x = (img.width - minSize) / 2;
      const y = (img.height - minSize) / 2;
      canvas.width = squareSize;
      canvas.height = squareSize;
      ctx.drawImage(img, x, y, minSize, minSize, 0, 0, squareSize, squareSize);

      const croppedPhotoSrc = canvas.toDataURL();
      resolve(croppedPhotoSrc);
    };
    img.onerror = (error) => {
      reject(error);
    };
    img.src = imageUrl;
  });
};

export function dataURLToBlob(dataURL: string) {
  const byteString = atob(dataURL.split(',')[1]);
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const intArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    intArray[i] = byteString.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: mimeString });
}

const connectionConfig = {
  iceServers: [
    {
      urls: [
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
      ],
    },
    {
      urls: "turn:your.turn.server:3478",
      username: "username",
      credential: "password",
    },
  ],
  iceCandidatePoolSize: 10,
}

export function registerPeerConnectionListeners(peerConnection) {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log(
        `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    console.log(
        `ICE connection state change: ${peerConnection.iceConnectionState}`);
  });
}

export const createRoom = async (roomId: string, peerConnection: RTCPeerConnection, localStream: MediaStream, remoteStream: MediaStream): Promise<{videoTrack: MediaStreamTrack | undefined, audioTrack: MediaStreamTrack | undefined, roomChannel: RealtimeChannel, calleeChannel: RealtimeChannel}> => {
  let videoTrack, audioTrack;
  // console.log('Create PeerConnection with configuration: ', connectionConfig);
  peerConnection = new RTCPeerConnection(connectionConfig);
  // registerPeerConnectionListeners(peerConnection);
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
    if(track.kind === "video") videoTrack = track;
    if(track.kind === "audio") audioTrack = track;
  });

  // collect the ICE candidates
  peerConnection.addEventListener("icecandidate", event => {
    if(!event.candidate){
      // console.log("Got final candidate !");
      return;
    }
    DB.from('ice_candidates').insert({
      room_id: roomId,
      candidate: event.candidate.toJSON(),
      type: 'caller'
    });
  });
  peerConnection.addEventListener("track", event => {
    // console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      // console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    })
  })

  // create a room
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  // console.log('Created offer:', offer);
  const roomWithOffer = {
    id: roomId,
    on_call: true,
    offer: {
      type: offer.type,
      sdp: offer.sdp
    }
  }
  await DB.from('rooms').insert(roomWithOffer);

  // listening for remote session description
  const roomChannel = DB.channel(`room-${roomId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rooms',
      filter: `id=eq.${roomId}`
    }, async (payload) => {
      const data = payload.new;
      if(!peerConnection.currentRemoteDescription && data && data.answer){
        // console.log('Got remote description: ', data.answer);
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(rtcSessionDescription);
      }
    })
    .subscribe();

  // listening for remote ICE candidates
  const calleeChannel = DB.channel(`callee-candidates-${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ice_candidates',
      filter: `room_id=eq.${roomId}`
    }, async (payload) => {
      const data = payload.new;
      if(data.type === 'callee'){
        // console.log(`Got new remote ICE candidate: ${JSON.stringify(data.candidate)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    })
    .subscribe();

  return {videoTrack: videoTrack, audioTrack: audioTrack, roomChannel, calleeChannel}
}

export const joinRoom = async (roomId, peerConnection, localStream, remoteStream) => {
  let videoTrack, audioTrack;
  const { data: roomData, error } = await DB.from('rooms').select('*').eq('id', roomId).single();
  if (error || !roomData) {
    console.error('Room not found:', error);
    return {videoTrack: null, audioTrack: null};
  }

  // console.log('Create PeerConnection with configuration: ', connectionConfig);
  peerConnection = new RTCPeerConnection(connectionConfig);
  // registerPeerConnectionListeners(peerConnection);
  // console.log(localStream)
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
    if(track.kind === "video") videoTrack = track;
    if(track.kind === "audio") audioTrack = track;
  });

  // collecting ICE candidates
  peerConnection.addEventListener('icecandidate', event => {
    if (!event.candidate){
      // console.log('Got final candidate!');
      return;
    }
    // console.log('Got candidate: ', event.candidate);
    DB.from('ice_candidates').insert({
      room_id: roomId,
      candidate: event.candidate.toJSON(),
      type: 'callee'
    });
  });

  peerConnection.addEventListener('track', event => {
    // console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      // console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    });
  });

  // creating SDP answer
  const offer = roomData.offer;
  // console.log('Got offer:', offer);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  // console.log('Created answer:', answer);
  await peerConnection.setLocalDescription(answer);
  const roomWithAnswer = {
    answer: {
      type: answer.type,
      sdp: answer.sdp
    }
  }
  await DB.from('rooms').update(roomWithAnswer).eq('id', roomId);

  // listening for remote ICE candidates
  const callerChannel = DB.channel(`caller-candidates-${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ice_candidates',
      filter: `room_id=eq.${roomId}`
    }, async (payload) => {
      const data = payload.new;
      if(data.type === 'caller'){
        // console.log(`Got new remote ICE candidate: ${JSON.stringify(data.candidate)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    })
    .subscribe();

  return {videoTrack: videoTrack, audioTrack: audioTrack, callerChannel};
}
export const deleteRoom = async (roomId: string) => {
  if (roomId) {
    // Delete all ICE candidates for this room
    await DB.from('ice_candidates').delete().eq('room_id', roomId);

    // Delete the room
    await DB.from('rooms').delete().eq('id', roomId);
    // console.log(`Room ${roomId} and its ICE candidates have been deleted.`);
  }
}
