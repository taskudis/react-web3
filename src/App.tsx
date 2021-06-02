import * as React from 'react';
import styled from 'styled-components';

import Web3Modal from 'web3modal';
// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider';
import Column from './components/Column';
// import Wrapper from './components/Wrapper';
import Header from './components/Header';
import Loader from './components/Loader';
import ConnectButton from './components/ConnectButton';
import CurrentLeader from './components/CurrentLeader';
import StateResultSubmitter from './components/StateResultsSubmitter';

import { Web3Provider } from '@ethersproject/providers';
import { getChainData } from './helpers/utilities';
import { US_ELECTION_ADDRESS } from './constants';
import US_ELECTION from './constants/abis/USElection.json';
import { getContract } from './helpers/ethers';

const SLayout = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  text-align: center;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
  position: absolute;
  width: 100%;
  background: #8000802e;
`;

const SLanding = styled(Column)`
  height: 600px;
`;

// @ts-ignore
const SBalances = styled(SLanding)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

interface IAppState {
  fetching: boolean;
  address: string;
  library: any;
  connected: boolean;
  chainId: number;
  pendingRequest: boolean;
  result: any | null;
  electionContract: any | null;
  info: any | null;
  currentLeader: string;
  transactionHash: string;
  bidenCode: number;
  trumpCode: number,
  bidenSeats: number,
  trumpSeats: number,
  electionEnded: boolean,
  transactionError: string
}

const INITIAL_STATE: IAppState = {
  fetching: false,
  address: '',
  library: null,
  connected: false,
  chainId: 1,
  pendingRequest: false,
  result: null,
  electionContract: null,
  info: null,
  currentLeader: '',
  transactionHash: '',
  bidenCode: 0,
  trumpCode: 0,
  bidenSeats: 0,
  trumpSeats: 0,
  electionEnded: false,
  transactionError: ''
};

class App extends React.Component<any, any> {
  // @ts-ignore
  public web3Modal: Web3Modal;
  public state: IAppState;
  public provider: any;

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };

    this.web3Modal = new Web3Modal({
      network: this.getNetwork(),
      cacheProvider: true,
      providerOptions: this.getProviderOptions(),
      theme: "dark"
    });
  }

  public componentDidMount() {
    if (this.web3Modal.cachedProvider) {
      this.onConnect();
    }
  }

  public onConnect = async () => {
    this.provider = await this.web3Modal.connect();

    const library = new Web3Provider(this.provider);

    const network = await library.getNetwork();

    const address = this.provider.selectedAddress ? this.provider.selectedAddress : this.provider?.accounts[0];

    await this.setState({
      library,
      chainId: network.chainId,
      address,
      connected: true
    });

    await this.subscribeToProviderEvents(this.provider);

    const electionContract = getContract(US_ELECTION_ADDRESS, US_ELECTION.abi, library, address);

    const bidenCode = await electionContract.BIDEN();
    const trumpCode = await electionContract.TRUMP();

    await this.setState({
      provider: this.provider,
      library,
      chainId: network.chainId,
      address,
      connected: true,
      electionContract,
      bidenCode,
      trumpCode
    });

    const bidenSeats = await this.getSeats(bidenCode);
    const trumpSeats = await this.getSeats(trumpCode);
    const electionStatus = await this.getElectionStatus();

    await this.setState({
      bidenSeats,
      trumpSeats,
      electionEnded: electionStatus
    });

    await this.currentLeader();
  };

  public subscribeToProviderEvents = async (provider:any) => {
    if (!provider.on) {
      return;
    }

    provider.on("accountsChanged", this.changedAccount);
    provider.on("networkChanged", this.networkChanged);
    provider.on("close", this.close);

    await this.web3Modal.off('accountsChanged');
  };

  public async unSubscribe(provider:any) {
    // Workaround for metamask widget > 9.0.3 (provider.off is undefined);
    window.location.reload(false);
    if (!provider.off) {
      return;
    }

    provider.off("accountsChanged", this.changedAccount);
    provider.off("networkChanged", this.networkChanged);
    provider.off("close", this.close);
  }

  public changedAccount = async (accounts: string[]) => {
    if(!accounts.length) {
      // Metamask Lock fire an empty accounts array
      await this.resetApp();
    } else {
      await this.setState({ address: accounts[0] });
    }
  }

  public networkChanged = async (networkId: number) => {
    const library = new Web3Provider(this.provider);
    const network = await library.getNetwork();
    const chainId = network.chainId;
    await this.setState({ chainId, library });
  }

  public close = async () => {
    this.resetApp();
  }

  public getNetwork = () => getChainData(this.state.chainId).network;

  public getProviderOptions = () => {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
        //   infuraId: process.env.REACT_APP_INFURA_ID,
          infuraId: '72c7b07ef4c44fa79845fbbd526412ed'
        }
      }
    };
    return providerOptions;
  };

  public resetApp = async () => {
    await this.web3Modal.clearCachedProvider();
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
    await this.unSubscribe(this.provider);

    this.setState({ ...INITIAL_STATE });

  };

  public currentLeader = async () => {
    const { electionContract } = this.state;

    const currentLeader = await electionContract.currentLeader();

    await this.setState({ currentLeader });
  };

  public submitElectionResult = async (data: string[]) => {

    try {
      const { electionContract, bidenCode, trumpCode } = this.state;

      await this.setState({ fetching: true });
		  const transaction = await electionContract.submitStateResult(data);

		  await this.setState({ transactionHash: transaction.hash });

      const transactionReceipt = await transaction.wait();
      if (transactionReceipt.status !== 1) {
        // React to failure
      } else {
        await this.currentLeader();
        const bidenSeats = await this.getSeats(bidenCode);
        const trumpSeats = await this.getSeats(trumpCode);

        await this.setState({
          bidenSeats,
          trumpSeats
        });

        await this.setState({ fetching: false });
      }
    } catch (e) {
      // TODO:: Find a way to access that error and show it to the user
      await this.setState({
        transactionError: "There was a transaction error durin the election results submit !",
        fetching: false
      });
    }
  };


  public getSeats = async (id: number) => {
    try {
      const { electionContract } = this.state;

      const seats = await electionContract.seats(id);
      return seats;
    } catch(e) {
      await this.setState({
        transactionError: "There was an during getting the seats numbers !",
      });
    }

  }

  public getElectionStatus = async () => {
    const { electionContract } = this.state;

    const status = await electionContract.electionEnded();
    return status;
  }

  public endElection = async () => {
    try {
      const { electionContract } = this.state;
      await electionContract.endElection();
    } catch(e) {
      await this.setState({
        transactionError: "There was an during ending the election !",
      });
    }

  }

  public render = () => {
    const {
      address,
      connected,
      chainId,
      fetching,
      currentLeader,
      transactionHash,
      bidenCode,
      trumpCode,
      bidenSeats,
      trumpSeats,
      electionEnded,
      transactionError
    } = this.state;

    const leaderNames = {
      [bidenCode]: "Biden",
      [trumpCode]: "Trump"
    };

    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
        {fetching && (
                <SContainer>
                  <Loader />
                  <p>{transactionHash}</p>
                  <a target="_blank" style={{cursor: 'pointer', color: 'white'}} href="https://etherscan.io/">View on Etherscan</a>
                </SContainer>
            )}

          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.resetApp}
          />
            {connected ? (
              <>
                <CurrentLeader
                  leader={leaderNames[currentLeader]}
                  bidenSeats={bidenSeats}
                  trumpSeats={trumpSeats}
                  electionStatus={electionEnded}
                  endElection={this.endElection}
                />
                <p style={{color: 'red'}}>{transactionError}</p>
                <StateResultSubmitter
                  submitResult={this.submitElectionResult}
                />
              </>
            ): null}
            {!this.state.connected && (
                <SLanding center>
                  {!this.state.connected && <ConnectButton onClick={this.onConnect} />}
                </SLanding>
              )}
        </Column>
      </SLayout>
    );
  };
}

export default App;
