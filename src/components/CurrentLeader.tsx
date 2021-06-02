import React from 'react'
import styled from 'styled-components'


interface ICurrentLeaderStyleProps {
    height?: number,
    width?: number
  }

interface ICurrentLeaderProps extends ICurrentLeaderStyleProps {
    endElection: () => void
    leader: string,
    bidenSeats: number,
    trumpSeats: number,
    electionStatus: boolean,
}

const SLeaderWrapper = styled.div<ICurrentLeaderStyleProps>`
  width: ${({ width }) => `${width}px`};
  height: ${({ height }) => `${height}px`};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  background: #1818ff14;
`

const SEndElectionButton = styled.div`
    background: #ff00009e;
    padding: 10px;
    cursor: pointer;
    border-radius: 10px;
    color: white;
`

const CurrentLeader = (props: ICurrentLeaderProps) => {
  const { leader, bidenSeats, trumpSeats, electionStatus, endElection } = props;

  return (
    <SLeaderWrapper width={props.width} {...props}>
        <div>Current leader is: {leader}</div>
        <div>
            <span style={{marginRight: '5px'}}>Biden: <span style={{color: 'red'}}>{bidenSeats} </span></span>
            <span style={{marginRight: '5px'}}>Trump: <span style={{color: 'blue'}}>{trumpSeats} </span></span>
        </div>
        <p>Election status: {electionStatus ? <span style={{color: 'red'}}>Over</span> : <span style={{color: 'green'}}>Active</span>}</p>
        <SEndElectionButton onClick={endElection}>End Election</SEndElectionButton>
    </SLeaderWrapper>
  )
}

CurrentLeader.defaultProps = {
  leader: '',
  width: 200,
  height: 200,
  endElection: () => {
      //
  }
}

export default CurrentLeader
