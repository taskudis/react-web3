import React , { useState } from 'react'
import styled from 'styled-components'

  interface IStateResultSubmitterProps {
    submitResult: (data: string[]) => void
  }

const SSubmitterWrapper = styled.div`
  width: 100%;
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  background: #1818ff14;
  margin-top: 20px;
`

const SSubmitterButton = styled.div`
    width: 200px;
    background: rgb(255 181 64);
    border-radius: 10px;
    padding: 10px;
    margin-bottom: 20px;
    color: white;
    cursor: pointer;
`

const SInputsWrapper = styled.div`
  display: flex;
  width: 70%;
  justify-content: space-evenly;
  margin-bottom: 20px;
`
const SInputWrapper = styled.div`
  max-width: 100px;
`

const SInput = styled.input`
  max-width: 100%;
`
const SValidationMessage = styled.p`
  color: red;
`

const StateResultSubmitter = (props: IStateResultSubmitterProps) => {
  const { submitResult } = props;
  const [stateName, setStateName] = useState('');
  const [votesBiden, setVotesBiden] = useState('');
  const [votesTrump, setVotesTrump] = useState('');
  const [stateSeats, setStateSeats] = useState('');
  const [validation, setValidation] = useState('');

  const onButtonClick = async () => {
    if (!stateName || !votesBiden || !votesTrump || !stateSeats) {
      return setValidation('Plese fill in all fields !');
    }

    setValidation('');

    const stateData = [stateName, votesBiden, votesTrump, stateSeats];
    await submitResult(stateData);
    resetInputs();
  }

  const resetInputs = () => {
    setStateName('');
    setVotesBiden('');
    setVotesTrump('');
    setStateSeats('');
  }

  return (
    <SSubmitterWrapper>
        <SInputsWrapper>
          <SInputWrapper>
              <p>State Name:</p>
              <SInput type='text' value={stateName} onChange={(e) => setStateName(e.target.value)}/>
          </SInputWrapper>
          <SInputWrapper>
              <p>Votes Biden:</p>
              <SInput type='number' value={votesBiden} onChange={(e) => setVotesBiden(e.target.value)}/>
          </SInputWrapper>
          <SInputWrapper>
              <p>Votes Trump</p>
              <SInput type='number' value={votesTrump} onChange={(e) => setVotesTrump(e.target.value)}/>
          </SInputWrapper>
          <SInputWrapper>
              <p>State seats:</p>
              <SInput type='number' value={stateSeats} onChange={(e) => setStateSeats(e.target.value)}/>
          </SInputWrapper>
        </SInputsWrapper>

        <SSubmitterButton onClick={() => onButtonClick()}>Submit Result</SSubmitterButton>
        <SValidationMessage>{validation}</SValidationMessage>
    </SSubmitterWrapper>
  )
}

StateResultSubmitter.defaultProps = {
  size: 400
}

export default StateResultSubmitter
