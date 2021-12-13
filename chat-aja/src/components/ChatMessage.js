import React from 'react';

export default function ChatMessage(props) {
  const { text, uid, photoURL, attachment } = props.message;

  const messageClass = uid === props.auth.currentUser?.uid ? 'sent' : 'received';
  return (<>
    <div className={`message ${messageClass}`}>
      <img alt="PP" src={photoURL} />
      {!attachment && <p>{text}</p>}
      {attachment && <p><img className="attachment" src={attachment} alt="attachment" /></p>}
    </div>
  </>)
}
