//Top coins get fetched from Coinpaprika
//Number can be determined in tokens.filter
async function getTopTokens(){
    const response = await fetch("https://api.coinpaprika.com/v1/coins");
    const tokens = await response.json();

    const tableBody = tokens
        .filter(token => token.rank >= 1 && token.rank <= 30)
        .map((token) => `
    <tr>
        <td>${token.rank}</td>
        <td>${token.name}</td>
        <td>${token.symbol}</td>
        </tr>
    `).join("");

    document.querySelector(".js-token-balances").innerHTML = tableBody;

    return tokens
        .filter(token => token.rank >= 1 && token.rank <= 30)
        .map(token => token.symbol); 
};

async function getTokenData(tickerList){
    const response = await fetch("https://api.1inch.exchange/v5.0/1/tokens");
    const tokens = await response.json();

    const tokenList = Object.values(tokens.tokens);

    return tokenList.filter(token => tickerList.includes(token.symbol));
};

//data gets added to <select> on the page
function renderForm(tokens){
    const options = tokens.map(token => 
        `<option value="${token.decimals}-${token.address}">${token.name} (${token.symbol})</option>`)
    


    document.querySelector(".from-token").innerHTML = options;
    document.querySelector(".to-token").innerHTML = options;
    document.querySelector(".js-submit-quote").removeAttribute("disabled");
};

//Form submit to get quote with conversion rate
async function formSubmitted(event){
    event.preventDefault();

    const fromToken = document.querySelector(`.from-token`).value;
    const toToken = document.querySelector(`.to-token`).value;
    const [fromDecimals, fromAddress] = fromToken.split("-");
    const [toDecimals, toAddress] = toToken.split("-");
    const fromUnit = 10 ** fromDecimals;
    const decimalRatio = 10 ** (fromDecimals - toDecimals);

    const url = `https://api.1inch.io/v5.0/1/quote?fromTokenAddress=${fromAddress}&toTokenAddress=${toAddress}&amount=${fromUnit}`;
    
    try{
        const response = await fetch(url);
        const quote = await response.json();
        const exchange_rate = Number(quote.toTokenAmount) / Number(quote.fromTokenAmount) * decimalRatio;

        document.querySelector(".js-quote-container").innerHTML = `
            <h2>Conversion rate: </h2>
            <p>1 ${quote.fromToken.symbol} = ${exchange_rate} ${quote.toToken.symbol}</p>
            <p>estimated Gas fee: ${quote.estimatedGas}</p>
        `;
    } catch(e){
        document.querySelector(".js-quote-container").innerHTML = `
            <h2>Conversion failed!</h2> 
            <p>Try again</p>
            <p>ERROR: ${e}</p>
        `;
    }
};

//Eventlistener for formSubmitted
document
    .querySelector(".js-submit-quote")
    .addEventListener("click", formSubmitted);

//Ready for implementing Web3 functionality with ethersjs
// @dev visit https://docs.ethers.io/v5/ for more
let provider, signer, instance, user, address;

//login
async function login() {
    //Initial setup
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    user = provider.getSigner();
    address = await user.getAddress();

    //@dev: Instance for Smart contract needs to be declared here
    //Follow pattern shown below
    /*  
    instance = new ethers.Contract(tokenAddress, abi, provider);
    signer = instance.connect(user); 
    */
};

//Connect Button functionality
//Button shows address after login function is completed
const $walletButton = document.querySelector('#btn-login');

$walletButton.addEventListener('click', async() => {
    //Will Start the metamask extension
    if (window.ethereum) { 
        $walletButton.innerHTML = "Connecting";
        await login();
        $walletButton.innerHTML = address;
    } else {
        $walletButton.innerHTML = "FAILED TO CONNECT WEB3; Install Web3 Provider!";
    };
});

//Function execution
getTopTokens()
    .then(getTokenData)
    .then(renderForm);