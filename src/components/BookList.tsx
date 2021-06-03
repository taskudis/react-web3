import React from 'react'

import styled from 'styled-components'

  interface IBookListProps {
    submitResult: () => void,
    heading: string,
    books: any[],
  }

const SSectionWrapper = styled.div`
  background: orange;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
`

const BookReturner = (props: IBookListProps) => {
  const { submitResult, heading  } = props;

  return (
    <>
      <SSectionWrapper>
        <div>
            <p>{heading}</p>
            <button onClick={submitResult}>Submit</button>
        </div>
      </SSectionWrapper>
    </>
  )
}

BookReturner.defaultProps = {
    heading: 'Default heading',
    books: []
}

export default BookReturner
