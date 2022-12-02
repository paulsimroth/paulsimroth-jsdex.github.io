
async function getTopTokens(){
    const response = await fetch("https://api.coinpaprika.com/v1/coins")
    const tokens = await response.json();
    console.log("API response", tokens);

    return tokens
        .filter(token => token.rank >= 1 && token.rank <= 50)
        .map(token => token.symbol);
};

async function getTokenData(tickerList){
    const response = await fetch("https://api.1inch.exchange/v5.0/1/tokens");
    const tokens = await response.json();
    console.log("API response, getTokeData", tokens);
    const tokenList = Object.values(tokens.tokens);

    return tokenList.filter(token => tickerList.includes(token.symbol));
};

function renderForm(tokens){
    const options = tokens.map(token => 
        `<option value="${token.decimals}-${token.address}">${token.name} (${token.symbol})</option>`)

    document.querySelector(`[name=from-token]`).innerHTML = options;
    document.querySelector(`[name=to-token]`).innerHTML = options;
    document.querySelector(".js-submit-quote").removeAttribute("disabled");
};

async function formSubmitted(event){
    event.preventDefault();

    const fromToken = document.querySelector(`[name=from-token]`).value;
    const toToken = document.querySelector(`[name=to-token]`).value;
    const [fromDecimals, fromAddress] = fromToken.split("-");
    const [toDecimals, toAddress] = toToken.split("-");
    const fromUnit = 10 ** fromDecimals;
    const decimalRatio = 10 ** (toDecimals -fromDecimals);

    const url = `https://api.1inch.io/v5.0/1/quote?fromTokenAddress=${fromAddress}&toTokenAddress=${toAddress}&amount=${fromUnit}`;
    
    try{
        const response = await fetch(url);
        const quote = await response.json();
        const exchange_rate = Number(quote.toTokenAmount) / Number(quote.fromTokenAmount) * decimalRatio;

        document.querySelector(".js-quote-container").innerHTML = `
            <p>${quote.fromToken.symbol} -> ${exchange_rate} ${quote.toToken.symbol}</p>
            <p>Gas fee: ${quote.estimatedGas}</p>
        `;
    } catch(e){
        document.querySelector(".js-quote-container").innerHTML = `Conversion failed!`;
    }
};

//Ready for implementing Web3 functionality with ethersjs
// @dev visit https://docs.ethers.io/v5/ for more
let provider, signer, instance, user, address;
async function login() {
    //Initial setup
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    user = provider.getSigner();
    address = await user.getAddress();
    //Instancee for Smart contract needs to be declared here
/*     instance = new ethers.Contract(tokenAddress, abi, provider);
    signer = instance.connect(user); */
};

const walletButton = document.querySelector('#btn-login');

walletButton.addEventListener('click', async() => {
    //Will Start the metamask extension
    if (window.ethereum) { 
        walletButton.innerHTML = "Connecting";
        await login();
        walletButton.innerHTML = address;
    } else {
        walletButton.innerHTML = "FAILED TO CONNECT WEB3; Install Web3 Provider!";
    };
});

/* document
    .querySelector(".js-submit-quote")
    .addEventListener("click", formSubmitted); */

getTopTokens()
    .then(getTokenData)
    .then(renderForm);
    