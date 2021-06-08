import * as React from 'react';
import styled from 'styled-components';

import Web3Modal from 'web3modal';
// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider';
import Column from './components/Column';
import Header from './components/Header';
import Loader from './components/Loader';
import ConnectButton from './components/ConnectButton';
import BookInteracter from './components/BookInteracter';
import BookList from './components/BookList';

import { Web3Provider } from '@ethersproject/providers';
import { getChainData, showNotification } from './helpers/utilities';
// Addresses
import { BOOK_LIBRARY_ADDRESS, LIB_WRAPPER_ADDRESS } from './constants';
// ABI's
import BOOK_LIBRARY from './constants/abis/BookLibrary.json';
import LIB_WRAPPER from './constants/abis/LIBWrapper.json';
import LIB_TOKEN from './constants/abis/LIB.json';
import { getContract, getParsedEther, getFormatedEther } from './helpers/ethers';
import { ethers } from 'ethers';

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
  ethWrapperContract: any | null,
  tokenContract: any | null,
  userLIBAmount: number,
  libraryLIBamount: string,
  wrapperLIBamount: string,
  requestedLIBAmount: string,
  bookRentPrice: string,
  libraryAllowance: string,
  contractRent: string,
  validAddresses: boolean,
  tokenContractAmount: string
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
  books: [],
  ethWrapperContract: null,
  tokenContract: null,
  userLIBAmount: 0,
  libraryLIBamount: '',
  wrapperLIBamount: '',
  requestedLIBAmount: '',
  bookRentPrice: '1',
  libraryAllowance: '',
  contractRent: '',
  validAddresses: true,
  tokenContractAmount: ''
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
    // Tricks
    // this.encodeTransaction(library);
    const validAddresses = ethers.utils.isAddress(BOOK_LIBRARY_ADDRESS) && ethers.utils.isAddress(LIB_WRAPPER_ADDRESS);
    await this.setState({validAddresses});

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
    const ETHWrapperContract = getContract(LIB_WRAPPER_ADDRESS, LIB_WRAPPER.abi, library, address);
    const wethAddress = await ETHWrapperContract.LIBToken();
    const tokenContract = getContract(wethAddress, LIB_TOKEN.abi, library, address);

	  const userBalance = await tokenContract.balanceOf(address);
    const libraryBalance = await tokenContract.balanceOf(BOOK_LIBRARY_ADDRESS);
    const wrapperBalance = await tokenContract.balanceOf(LIB_WRAPPER_ADDRESS);
    let tokenContractBalance = await tokenContract.balanceOf(wethAddress);

    // use ethers.utils
    let libraryAllowance = await tokenContract.allowance(address, BOOK_LIBRARY_ADDRESS);
    libraryAllowance = ethers.utils.formatUnits(libraryAllowance, 18);
    await this.setState({ libraryAllowance});

    tokenContractBalance = ethers.utils.formatUnits(tokenContractBalance, 18);
    await this.setState({ libraryAllowance});

    const contractRent = await booksContract.rent();
    await this.setState({ contractRent: getFormatedEther(contractRent.toString()) });

    await this.setState({
      provider: this.provider,
      library,
      chainId: network.chainId,
      address,
      connected: true,
      booksContract,
      ethWrapperContract: ETHWrapperContract,
      tokenContract,
      userLIBAmount: getFormatedEther(userBalance.toString()),
      libraryLIBamount: getFormatedEther(libraryBalance.toString()),
      wrapperLIBamount: getFormatedEther(wrapperBalance.toString()),
      tokenContractAmount: tokenContractBalance
    });

    // Subscribe for Book Libraray events
    booksContract.on('BookAdded', this.handleBookAddedEvent);
    booksContract.on('BookBorrowed', this.handleBookBorrow);
    booksContract.on('BookReturned', this.handleBookReturn);

    // Subscribe for Token Transfer event
    const filterLibraryTransfer = tokenContract.filters.Transfer(
      null, BOOK_LIBRARY_ADDRESS, null
    );
    tokenContract.on(filterLibraryTransfer, this.handleTransferEvent);

    await this.listBooks();

    // signing
    // const { messageHash, signedMessage } = await this.signMessage('Hello');
    // await this.wrapWithSignedMessage(messageHash, signedMessage, address);

    // borrow by signature
    // const bookPrice = ethers.utils.parseEther("0.001").toString();
    // const sig = await this.onAttemptToApprove();

    // const nonce = await tokenContract.nonces(address);
    // const verifyPermit = await tokenContract.checkPermit(address, BOOK_LIBRARY_ADDRESS, bookPrice, sig.deadline, sig.v, sig.r, sig.s, nonce);

    // const borrowBookT = await booksContract.borrowBookBySignature('lord', bookPrice, sig.deadline, sig.v, sig.r, sig.s);
    // await borrowBookT.wait();
  };

  // Event Handlers
  public handleBookAddedEvent = async (name: string) => {
    const msg = `Book added name is ${name}`;
    showNotification(msg);
  }

  public handleBookBorrow = async (name: string) => {
    const msg = `Book borrowed name is ${name}`;
    showNotification(msg);
  }

  public handleBookReturn = async (name: string) => {
    const msg = `Book returned name is ${name}`;
    showNotification(msg);
  }

  public handleTransferEvent = async (from: string, to: string, value: string) => {
    console.log(BOOK_LIBRARY_ADDRESS);
    console.log(to);
    const text = `Transfer event from librray : ${to} and value is ${value}`
    showNotification(text);
  }

  // Ethers Tricks
  public encodeTransaction = async () => {
    const iface = new ethers.utils.Interface(BOOK_LIBRARY.abi);
    const encodedData = iface.encodeFunctionData("addBook", ['Test for Test', 10]);
    const library = new Web3Provider(this.provider);
    const signer = library.getSigner();

    const tx = {
      to: BOOK_LIBRARY_ADDRESS,
      data: encodedData
    };
    await signer.sendTransaction(tx);
  }

  // Sign a message
  public async signMessage(messageToSign: string) {
    const { library } = this.state;
    const signer = library.getSigner();
    const messageHash = ethers.utils.solidityKeccak256(['string'], [messageToSign]);
    const arrayfiedHash = ethers.utils.arrayify(messageHash);
    const signedMessage = await signer.signMessage(arrayfiedHash);
    return {
      messageHash,
      signedMessage
    }
  }

  public async onAttemptToApprove() {
		const { tokenContract, address, library } = this.state;

		const nonce = (await tokenContract.nonces(address)); // Our Token Contract Nonces
    const deadline = + new Date() + 60 * 60; // Permit with deadline which the permit is valid
    const wrapValue = ethers.utils.parseEther('0.001'); // Value to approve for the spender to use

		const EIP712Domain = [ // array of objects -> properties from the contract and the types of them ircwithPermit
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'verifyingContract', type: 'address' }
    ];

    const domain = {
        name: await tokenContract.name(),
        version: '1',
        verifyingContract: tokenContract.address
    };

    const Permit = [ // array of objects -> properties from erc20withpermit
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
    ];

    const message = {
        owner: address,
        spender: BOOK_LIBRARY_ADDRESS,
        value: wrapValue.toString(),
        nonce: nonce.toHexString(),
        deadline
    };

    const data = JSON.stringify({
        types: {
            EIP712Domain,
            Permit
        },
        domain,
        primaryType: 'Permit',
        message
    })

    const signatureLike = await library.send('eth_signTypedData_v4', [address, data]);
    const signature = await ethers.utils.splitSignature(signatureLike);

    const preparedSignature = {
        v: signature.v,
        r: signature.r,
        s: signature.s,
        deadline
    }

    return preparedSignature
}

  public async wrapWithSignedMessage(hashedMessage: string, signedMessage: string, receiver: string) {
    const { ethWrapperContract } = this.state;
    const wrapValue = ethers.utils.parseEther("0.001").toString();
    const sig = ethers.utils.splitSignature(signedMessage);
    const wrapTx = await ethWrapperContract.wrapWithSignature(hashedMessage, sig.v, sig.r, sig.s, receiver,  {value: wrapValue})
    console.log(wrapTx);
  }

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
    const {booksContract , tokenContract} = this.state;

    booksContract.off('BookAdded', this.handleBookAddedEvent);
    booksContract.off('BookBorrowed', this.handleBookBorrow);
    booksContract.off('BookReturned', this.handleBookReturn);
    tokenContract.off(this.handleTransferEvent);

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
      await this.listBooks();

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
      await this.listBooks();
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
    await this.approveRent();

    const { booksContract } = this.state;

    try {
      await this.setState({ fetching: true });
      const borrowBookT = await booksContract.borrowBook(name);
      await this.setState({ transactionHash: borrowBookT.hash });
      const borrowBookR = await borrowBookT.wait();
      await this.listBooks();
      await this.setState({ fetching: false });

      if (borrowBookR.status !== 1) {
        // Error
      } else {
        // TODO :: display the success message
        await this.setState({ transactionSuccess: "Book Borrowed !"});
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
      await this.setState({ fetching: true });
      const books = await booksContract.getStoredBooks();
      const booksPromises: any[] = books.map(async (name: string) => {
        return await booksContract.getBook(name);
      });

      const booksData = await Promise.all(booksPromises);
      await this.setState({
        transactionSuccess: "Books Listed !",
        books: booksData,
        fetching: false
      });
    } catch (e) {
      await this.setState({
        transactionError: "There was an during book listing !",
      });
    }
  }

  public getLIB = async (amount: string) => {
    // - Allow the users to send ETH to a contract and get back LIB in 1:1 relation (similar to wrapping).
    try {
      const { ethWrapperContract, tokenContract, address } = this.state;
      const wrapValue = getParsedEther(amount);
      await this.setState({ fetching: true });
      const wrapTx = await ethWrapperContract.wrap({value: wrapValue})
      await this.setState({ transactionHash: wrapTx.hash });
      const wraptTr = await wrapTx.wait();
      await this.setState({ fetching: false });

      if (wraptTr.status !== 1) {
        // Error
      } else {
        const balance = await tokenContract.balanceOf(address).toString();
        await this.setState({ userLIBAmount: balance });
      }
    } catch (err) {
      await this.setState({
        transactionError: "There was an during LIB token purchase !",
      });
    }
  }

  public approveRent = async () => {
    try {
      const { tokenContract, address } = this.state;
      const bookPrice = ethers.utils.parseEther("0.001").toString();

      await this.setState({ fetching: true });
      const rentTx = await tokenContract.approve(BOOK_LIBRARY_ADDRESS, bookPrice);
      await this.setState({ transactionHash: rentTx.hash });
      await rentTx.wait();

      const libraryAllowance = await tokenContract.allowance(address, BOOK_LIBRARY_ADDRESS);
      await this.setState({ libraryAllowance: getFormatedEther(libraryAllowance.toString()) });
      await this.setState({ fetching: false });

    } catch (e) {
      await this.setState({ transactionError: "There was an error during LIB rent allowance !", });
    }
  }

  public withdraw = async () => {
    const { booksContract, tokenContract, address } = this.state;

    try {
      await this.setState({ fetching: true });
      const withdrawT = await booksContract.withdrawLibraryAmount();
      await this.setState({ transactionHash: withdrawT.hash });
      await withdrawT.wait();
	    const balance = await tokenContract.balanceOf(address);
      await this.setState({ userLIBAmount: getFormatedEther(balance.toString())  });
      await this.setState({ fetching: false });


    } catch (e) {
      await this.setState({ transactionError: "There was an error during LIB withdraw !", });
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
      userLIBAmount,
      requestedLIBAmount,
      libraryLIBamount,
      wrapperLIBamount,
      libraryAllowance,
      contractRent,
      validAddresses,
      tokenContractAmount,
      books
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
                <p>Valid contract addresses: {validAddresses ? 'yes' : 'no'}</p>
                <p>USER LIB amount: {userLIBAmount}</p>
                <p>Library LIB amount: {libraryLIBamount}</p>
                <p>Wrapper LIB amount: {wrapperLIBamount}</p>
                <p>Token Contract amount: {tokenContractAmount}</p>
                <p>Library LIB allowance: {libraryAllowance}</p>
                <p>Library Contract Rent price: {contractRent}</p>
                <div>
                  <p>Get LIB Token</p>
                  <input
                    type="text"
                    placeholder="ETH to LIB"
                    value={requestedLIBAmount}
                    onChange={(e) => this.setState({requestedLIBAmount: e.target.value})}
                    />
                  <button onClick={() => this.getLIB(requestedLIBAmount)}>Submit</button>
                  <button onClick={() => this.withdraw()}>Withdraw</button>
                </div>
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
                  books={books}
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
