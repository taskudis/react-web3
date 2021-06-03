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
import BookInteracter from './components/BookInteracter';
import BookList from './components/BookList';

import { Web3Provider } from '@ethersproject/providers';
import { getChainData } from './helpers/utilities';
import { BOOK_LIBRARY_ADDRESS } from './constants';
import BOOK_LIBRARY from './constants/abis/BookLibrary.json';
import { getContract } from './helpers/ethers';

// - Have a UI to create book, rent a book, return a book, see books available and their copies
// - Handle errors and faulty transactions (error handling)

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
  booksContract: any | null;
  info: any | null;
  currentLeader: string;
  transactionHash: string;
  transactionError: string,
  transactionSuccess: string,
  returnBookName: string,
  returnBookCount: string,
  books: any,
}

const INITIAL_STATE: IAppState = {
  fetching: false,
  address: '',
  library: null,
  connected: false,
  chainId: 1,
  pendingRequest: false,
  result: null,
  booksContract: null,
  info: null,
  currentLeader: '',
  transactionHash: '',
  transactionError: '',
  transactionSuccess: '',
  returnBookName: '',
  returnBookCount: '',
  books: []
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

    const booksContract = getContract(BOOK_LIBRARY_ADDRESS, BOOK_LIBRARY.abi, library, address);

    await this.setState({
      provider: this.provider,
      library,
      chainId: network.chainId,
      address,
      connected: true,
      booksContract
    });
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

  public addBook = async (name: string, count: string) => {
    const { booksContract } = this.state;

    try {

      await this.setState({ fetching: true });
      const addBookT = await booksContract.addBook(name, count);
      await this.setState({ transactionHash: addBookT.hash });
      const addBookR = await addBookT.wait();
      await this.setState({ fetching: false });

      if (addBookR.status !== 1) {
        // Error
      } else {
        // TODO :: display the success message
        await this.setState({
          transactionSuccess: "Book Added !",
        });
      }
    } catch (e) {
      await this.setState({
        transactionError: "There was an during book add !",
      });
    }
  }

  public returnBook = async (name: string, count: string) => {
    const { booksContract } = this.state;

    try {
      await this.setState({ fetching: true });
      const returnBookT = await booksContract.returnBook(name, count);
      await this.setState({ transactionHash: returnBookT.hash });
      const addBookR = await returnBookT.wait();
      await this.setState({ fetching: false });

      if (addBookR.status !== 1) {
        // Error
      } else {
        // TODO :: display the success message
        await this.setState({
          transactionSuccess: "Book Returned !",
        });
      }
    } catch (e) {
      await this.setState({
        transactionError: "There was an during book return !",
      });
    }
  }

  public borrowBook = async (name: string) => {
    // TODO:: this contract method doesnt work for some reason
    const { booksContract } = this.state;

    try {
      await this.setState({ fetching: true });
      const borrowBookT = await booksContract.borrowBook(name);
      await this.setState({ transactionHash: borrowBookT.hash });
      const borrowBookR = await borrowBookT.wait();
      await this.setState({ fetching: false });

      if (borrowBookR.status !== 1) {
        // Error
      } else {
        // TODO :: display the success message
        await this.setState({
          transactionSuccess: "Book Borrowed !",
        });
      }
    } catch (e) {
      await this.setState({
        transactionError: "There was an during book borrow !",
      });
    }
  }

  public listBooks = async () => {
    const { booksContract } = this.state;

    try {
      const books = await booksContract.getAvailableBooks();
      await this.setState({
        transactionSuccess: "Books Listed !",
        books
      });
    } catch (e) {
      await this.setState({
        transactionError: "There was an during book borrow !",
      });
    }
  }

  public render = () => {
    const {
      address,
      connected,
      chainId,
      fetching,
      transactionHash,
      transactionError,
    } = this.state;

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
                <p style={{color: 'red'}}>{transactionError}</p>
                <BookInteracter
                  submitResult={this.addBook}
                  heading="Create a Book"
                  />
                <BookInteracter
                  submitResult={this.returnBook}
                  heading="Return a Book"
                  />
                <BookInteracter
                  submitResult={this.borrowBook}
                  heading="Borrow a Book"
                  countInput={false}
                  />
                <BookList
                  submitResult={this.listBooks}
                  heading="List Available Books"
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
