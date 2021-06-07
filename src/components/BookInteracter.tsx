import React , { useState } from 'react'

import styled from 'styled-components'

  interface IBookInteracterProps {
    submitResult: (name: string, count: string) => void,
    heading: string,
    nameInput: boolean,
    countInput: boolean
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

const BookInteracter = (props: IBookInteracterProps) => {
  const { submitResult, heading, nameInput, countInput } = props;
  const [name, setBookName] = useState('');
  const [count, setBookCount] = useState('');
  const [validation, setValidation] = useState('');

  const onButtonClick = async () => {
    if ((!name && nameInput) || (!count && countInput)) {
      return setValidation('Plese fill in all fields !');
    }

    setValidation('');

    await submitResult(name, count);
    resetInputs();
  }

  const resetInputs = () => {
    setBookName('');
    setBookCount('');
  }

  return (
    <>
      <SSectionWrapper>
        <div>
            <p>{heading}</p>
            <p style={{ display: nameInput ? "block": "none"}}>Name <input type="text" value={name} onChange={(e) => setBookName(e.target.value)}/></p>
            <p style={{ display: countInput ? "block": "none"}}>Count <input type="text" value={count} onChange={(e) => setBookCount(e.target.value)}/></p>
            <button onClick={onButtonClick}>Submit</button>
        </div>
      </SSectionWrapper>
      <p style={{color: 'red'}}>{validation}</p>
    </>
  )
}

BookInteracter.defaultProps = {
    heading: 'Default heading',
    nameInput: true,
    countInput: true
}

export default BookInteracter
