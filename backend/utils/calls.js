const activeCalls = {};

export const addCall = (callerId, receiverId) => {

    activeCalls[callerId] = {
        receiverId,
        status:"calling"
    };

};


export const updateCallStatus = (callerId,status)=>{

    if(activeCalls[callerId]){
        activeCalls[callerId].status=status;
    }

};


export const removeCall = (callerId)=>{

    delete activeCalls[callerId];

};


export const getCallByReceiver = (receiverId)=>{

    return Object.entries(activeCalls)
    .find(
      ([caller,call]) =>
      call.receiverId === receiverId
    );

};
