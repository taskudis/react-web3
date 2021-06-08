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
  const { submitResult, heading, books  } = props;
  const bookElements = books.map((book, index) => {
    return (
          <li key={index}>
            <h5>Book heading: {book.id}</h5>
            <h6>Book count: {book.count}</h6>
          </li>
    )
  })
  return (
    <>
      <SSectionWrapper>
        <div>
            <p>{heading}</p>
            <button onClick={submitResult}>Submit</button>
            <ul>
              {bookElements}
            </ul>
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
