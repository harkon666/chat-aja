import React from 'react';

export default function SignOut(props) {
  return props.auth.currentUser && (
    <button onClick={props.signOut}>
      Sign Out
    </button>
  )
}