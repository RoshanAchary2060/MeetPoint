import { addConnection, removeConnection, sendEventToUser } from "../utils/sse.js";
import PendingCall from "../models/PendingCall.js";
import { getCallByReceiver, removeCall } from "../utils/calls.js";

export const sseController = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).end();
  }

  if (res.headersSent) {
    return;
  }


  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");


  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }


  // register connection
  addConnection(userId, req, res);


  // initial event
  res.write(
    `data: ${JSON.stringify({
      type:"CONNECTED"
    })}\n\n`
  );


  // Check pending calls
  try {

    const pendingCall = await PendingCall.findOne({
      receiverId:userId,
      status:{
        $in:[
          "calling",
          "ringing"
        ]
      }
    });


    console.log(
      "Pending Call Found:",
      pendingCall
    );


    if(pendingCall){

      res.write(
        `data: ${JSON.stringify({
          type:"INCOMING_AUDIO_CALL",
          from_user_id:pendingCall.callerId,
          caller:pendingCall.caller
        })}\n\n`
      );

    }


  } catch(error){

    console.log(
      "Pending call check error:",
      error
    );

  }



  // Disconnect handler
  req.on("close", async()=>{

    console.log(
      "CLIENT CLOSED:",
      userId
    );


    removeConnection(userId,res);



    try{

      /*
        1. Remove temporary call memory
      */

      const call = getCallByReceiver(userId);


      if(call){

        const [callerId] = call;


        sendEventToUser(
          callerId,
          {
            type:"CALL_ENDED",
            reason:"receiver_disconnected"
          }
        );


        removeCall(callerId);

      }



      /*
        2. Remove Mongo pending call
      */

      const pendingCall = await PendingCall.findOne({
        $or:[
          {
            callerId:userId
          },
          {
            receiverId:userId
          }
        ],
        status:{
          $in:[
            "calling",
            "ringing"
          ]
        }
      });



      if(pendingCall){


        console.log(
          "Removing stale pending call:",
          pendingCall._id
        );


        await PendingCall.findByIdAndDelete(
          pendingCall._id
        );


        const otherUser =
          pendingCall.callerId === userId
          ? pendingCall.receiverId
          : pendingCall.callerId;



        sendEventToUser(
          otherUser,
          {
            type:"CALL_ENDED",
            reason:"network_disconnect"
          }
        );


      }


    }catch(error){

      console.log(
        "Disconnect cleanup error:",
        error
      );

    }


  });


};
