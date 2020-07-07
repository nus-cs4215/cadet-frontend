import * as React from 'react';
import CSS from 'csstype'; // TODO: Remove
import {
  Card,
  Button,
  ButtonGroup,
  Icon,
  Popover,
  Menu,
  MenuItem,
  Position,
  Divider
} from '@blueprintjs/core';
import { format } from 'timeago.js';
import Markdown from '../Markdown';
import { CommentAPI } from './useComments';
import { EventEmitter } from 'events';
import { some, omit } from 'lodash';

export interface IComment {
  id: string;
  isCollapsed: boolean;
  // TODO: Reference user differently.
  username: string;
  profilePic: string;
  linenum: number;
  text: string;
  datetime: number; // if this is infinity, means not submitted yet!
  // Infinity so it gets sorted to bottom.
}

export interface CommentsProps {
  comments: IComment[]; // Ordering guaranteed to be ascending order.
  commentsBeingEditedRef: React.MutableRefObject<{ [id: string]: IComment }>;
  APIRef: React.MutableRefObject<CommentAPI>;
  commentEditChangeEE: EventEmitter;
}

// =============== STYLES ===============
// TODO: REMOVE.

const commentsContainerStyles: CSS.Properties = {
  display: 'grid',
  gridTemplateColumns: '3em auto',
  fontFamily: `-apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Open Sans", "Helvetica Neue", "Icons16", sans-serif`
};

const commentStyles: CSS.Properties = {
  gridColumn: 2,
  display: 'grid',
  gridTemplateColumns: '4em auto',
  fontSize: '0.8em',
  backgroundColor: '#253545'
};

const contentStyles: CSS.Properties = {};

const optionStyles: CSS.Properties = {
  float: 'right',
  padding: '0.3em'
};

const relativeTimeStyles: CSS.Properties = {
  color: 'lightgray'
};

const usernameStyles: CSS.Properties = {
  fontWeight: 'bolder'
};

const profilePicStyles: CSS.Properties = {
  width: '3em',
  height: '3em'
};

const replyContainerStyles: CSS.Properties = {
  gridColumn: '1 / 3',
  padding: '0.5em',
  backgroundColor: 'grey'
};

const enterMessageStyles: CSS.Properties = {
  width: '100%',
  display: 'block',
  resize: 'vertical'
};

const errorTextStyles: CSS.Properties = {
    color: "red",
    padding: "0.2em"
};

/* Note on interfacing with extra data.

The currentComment will be overwritten by parent refreshing from new data. 
-Either: Dump in redux store / localstorage.
-Get a ref to the element from the parent, then request it for data, update and restore it.
-This WILL cause the focus on the textArea to be lost 
 because it will be re-rendered by the parent component.
*/

// Mock function, please replace.
function sendToServer(comment: IComment) {
  return new Promise((resolve, reject) => {
      if(Math.random() < 0.5) {
        setTimeout(resolve, 1000);
      } else {
        setTimeout(() => reject('(Test error message) Some error occured, please try again'), 1000);
      }
  });
}

export default function Comments(props: CommentsProps) {
  const { comments, commentsBeingEditedRef, APIRef, commentEditChangeEE } = props;
  // Errors are local.
  const [errorMsgs, setErrorMsgs] = React.useState({} as {[id: string]: string});

  const {
    updateComment,
    updateCommentsBeingEdited,
    removeComment,
    removeCommentEdit,
    isUnsubmittedComment
  } = APIRef.current;

  // Yes, this is an antipattern.
  // It's also the only way to prevent the parent from being updated.
  // While allowing the child to update.
  const [commentsBeingEdited, setCommentsBeingEdited] = React.useState(
    commentsBeingEditedRef.current
  );

  React.useEffect(() => {
    const callback = (x: any) => {
      setCommentsBeingEdited(x);
    };
    commentEditChangeEE.on('change', callback);
    return () => {
      commentEditChangeEE.off('change', callback);
    };
  }, [commentEditChangeEE, commentsBeingEditedRef]);

  // ---------------- STATE HELPERS ----------------

  // Will be required later to propagate the changes back.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  function updatePreviewCommentText(comment: IComment) {
    return function (event: React.ChangeEvent<HTMLTextAreaElement>) {
      const text = event.target.value;
      updateCommentsBeingEdited({
        ...comment,
        text
      });
    };
  }

  // ---------------- CONTROLS ----------------

  function cancelWithPrompt(comment: IComment) {
    return function (evt: any) {
      // eslint-disable-next-line no-restricted-globals
      const sure = comment.text.trim() === '' || confirm('Are you sure about that?');
      if (sure) {
        if (isUnsubmittedComment(comment)) {
          removeComment(comment);
        } else {
          removeCommentEdit(comment);
        }
      }
    };
  }

  function confirmSubmit(comment: IComment) {
    return async function (evt: any) {
      // TODO: figure out a method for edits
      const newComment: IComment = {
        ...comment,
        datetime: Date.now()
      };

      // TODO: feedback to user first
      try {
        await sendToServer(newComment); // TODO: STUB FUNCTION, PLEASE UPDATE.
        updateComment(newComment);
        removeCommentEdit(newComment);
        setErrorMsgs(omit(errorMsgs, [comment.id]));
      } catch (e) {
        setErrorMsgs({
            ...errorMsgs,
            [comment.id]: e,
        });
      }
    };
  }

  function editComment(comment: IComment) {
    return function (evt: any) {
      // Puts this comment as being updated
      updateCommentsBeingEdited(comment);
    };
  }

  function deleteComment(comment: IComment) {
    return async function (evt: any) {
      try {
        await sendToServer(comment);
        removeComment(comment);
        setErrorMsgs(omit(errorMsgs, [comment.id]));
      } catch (e) {
        setErrorMsgs({
            ...errorMsgs,
            [comment.id]: e,
        });
      }
    };
  }

  function setCollapse(comment: IComment, status: boolean) {
    return function (evt: any) {
      updateComment({
        ...comment,
        isCollapsed: status
      });
    };
  }

  function setCollapseAll(status: boolean) {
    return function (evt: any) {
      const newComments = comments.map(comment => ({
        ...comment,
        isCollapsed: status
      }));
      updateComment(...newComments);
    };
  }

  // ----------------- RENDERING -----------------
  const isCollapsed = some(comments, c => c.isCollapsed);
  return (
    <div className="comments-container" style={commentsContainerStyles}>
      <div
        className="gutter-controls"
        style={{ float: 'left' }}
        onClick={setCollapseAll(!isCollapsed)}
      >
        <Icon icon={isCollapsed ? 'small-plus' : 'small-minus'}></Icon>
      </div>
      {comments.map(comment => {
        const { id, isCollapsed } = comment; // Only the main comment is collapsed.
        const error = errorMsgs[id] || '';
        const displayComment = commentsBeingEdited[id] ? commentsBeingEdited[id] : comment;
        const { profilePic, username, text, datetime } = displayComment;
        const isEditing: boolean = !!commentsBeingEdited[id];
        if (isCollapsed) {
          return (
            <div
              onClick={setCollapse(comment, false)}
              style={{
                backgroundColor: 'rgb(37, 53, 69)',
                paddingTop: '0.5em',
                gridColumn: '2'
              }}
            >
              <Divider style={{ borderColor: 'rgba(144, 144, 144, 0.4)' }}></Divider>
            </div>
          );
        }
        return (
          <Card className="comment" key={id} style={commentStyles}>
            <img className="profile-pic" src={profilePic} alt="" style={profilePicStyles}></img>
            <div className="content" style={contentStyles}>
              {
                /* Popover bp-layout="float-right" isn't working */
                !isEditing ? (
                  <div style={optionStyles}>
                    <Popover
                      content={
                        <Menu>
                          <MenuItem text="Edit" onClick={editComment(comment)}></MenuItem>
                          <MenuItem text="Delete" onClick={deleteComment(comment)}></MenuItem>
                        </Menu>
                      }
                      position={Position.RIGHT_TOP}
                    >
                      <Icon icon="more"></Icon>
                    </Popover>
                  </div>
                ) : (
                  ''
                )
              }
              <div style={optionStyles}>
                <Icon icon="small-minus" onClick={setCollapse(comment, true)}></Icon>
              </div>
              <span className="username" style={usernameStyles}>
                {username}{' '}
              </span>
              <span className="relative-time" style={relativeTimeStyles}>
                {isUnsubmittedComment(comment) ? 'Preview' : format(new Date(datetime))}
              </span>
              <Markdown className="text" content={text || '(Content preview)'} />
              <div className="error-text" style={errorTextStyles}>{error}</div>
            </div>
            {isEditing ? (
              <div className="reply-container" style={replyContainerStyles}>
                <textarea
                  style={enterMessageStyles}
                  placeholder="Write a message..."
                  onChange={updatePreviewCommentText(displayComment)}
                  defaultValue={text}
                ></textarea>
                <ButtonGroup>
                  <Button onClick={cancelWithPrompt(displayComment)}>Cancel</Button>
                  <Button
                    intent="success"
                    onClick={confirmSubmit(displayComment)}
                    disabled={text.trim().length === 0}
                  >
                    Submit
                  </Button>
                </ButtonGroup>
              </div>
            ) : (
              ''
            )}
          </Card>
        );
      })}
    </div>
  );
}
