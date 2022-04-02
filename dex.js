// connect to Moralis server
  
const serverUrl = "https://qwooohemv7mx.usemoralis.com:2053/server";
const appId = "yJQGfOU6Ln8elubJJVnTEpSMeAfxtVOqEzUmuhr4";
Moralis.start({ serverUrl, appId });

Moralis.initPlugins().then(() => console.log("Plugins initialized"));

const $tokenBalanceTBody = document.querySelector(".js-token-balances");
const $selectedToken = document.querySelector(".js-from-token");
const $amountInput = document.querySelector("js-from-amount");

//utilities
//Converting from Wei using custom function
const tokenValue = (value, decimals) =>
    (decimals ? value / Math.pow(10, decimals) : value);

//Metamask login

async function login() {
    let user = Moralis.User.current();
    if (!user) {
      user = await Moralis.authenticate();
    }
    console.log("logged in user:", user);
    getStats();
}

async function initSwapForm(event){
    event.preventDefault();
    $selectedToken.innerText = event.target.dataset.symbol;
    $selectedToken.dataset.address = event.target.dataset.address;
    $selectedToken.dataset.decimals = event.target.dataset.decimals;
    $selectedToken.dataset.max = event.target.dataset.max;
    $amountInput.removeAttribute("disabled");
    $amountInput.value = "";
    document.querySelector(".js-submit").removeAttribute("disabled");
    document.querySelector(".js-cancel").removeAttribute("disabled");
    document.querySelector(".js-quote-container").innerHTML = "";
    document.querySelector(".js-amount-error").innerText = "";
}

async function getStats(){
    const balances = await Moralis.Web3API.account.getTokenBalances({chain: "polygon"});
    console.log(balances);
    $tokenBalanceTBody.innerHTML = balances.map((token, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${token.symbol}</td>
            <td>${tokenValue(token.balance, token.decimals)}</td>
            <td>
                <button class="js-swap btn btn-primary" 
                    data-address="${token.token_address}"
                    data-symbol="${token.symbol}"
                    data-decimals="${token.decimals}"
                    data-max="${tokenValue(token.balance, token.decimals)}"
                >
                    SWAP
                </button>
            </td>
        </tr>
    `).join("");

    for(let $btn of $tokenBalanceTBody.querySelectorAll(".js-swap")){
        $btn.addEventListener("click", initSwapForm);
    }
}

//Buy crypto with fiat using the Onramper plugin on Moralis
async function buyCrypto(){
    Moralis.Plugins.fiat.buy();
}

async function logOut() {
    await Moralis.User.logOut();
    console.log("logged out");
}

// Event listener for buttons Login, Logout, Buy Crypto

document.querySelector("#btn-login").addEventListener("click", login);
document.querySelector("#btn-buy-crypto").addEventListener("click", buyCrypto);
document.querySelector("#btn-logout").addEventListener("click", logOut);

// Quote / Swap

async function formSubmitted(event){
    event.preventDefault();
    const fromAmount = Number.parseFloat($amountInput.value);
    const fromMaxValue = Number.parseFloat($selectedToken.dataset.max);

    if (Number.isNaN(fromAmount) || fromAmount > fromMaxValue){
        //invalid input
        document.querySelector(".js-amount-error").innerText = "invalid Amount";
        return;
    } else {
        document.querySelector(".js-amount-error").innerText = "";
    };

    //submission of quote request 
    const fromDecimals = $selectedToken.dataset.decimals;
    const fromAddress =  $selectedToken.dataset.address;

    const [toAddress, toDecimals] = document.querySelector("[name=to-token").value.split("-");

    try{
        const quote = await Moralis.Plugins.oneInch.quote({
              chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
              fromTokenAddress: fromAddress, // The token you want to swap
              toTokenAddress: toAddress, // The token you want to receive
              amount: Moralis.Units.Token(fromAmount, fromDecimals),
            });
        
        const toAmount = tokenValue(quote.toTokenAmount, toDecimals);
        
        document.querySelector(".js-quote-container").innerHTML = `
            <p>${fromAmount} ${quote.fromToken.symbol} = ${toAmount} ${quote.toToken.symbol}</p>
            <p> Estimated Gas: ${quote.estimatedGas}<p>
        `;

    } catch(e) {
        document.querySelector(".js-quote-container").innerHTML = `
            <p class="error">The conversion failed!</p>
        `;
    }
}


async function formCanceled(event){
    event.preventDefault();
    document.querySelector(".js-submit").setAttribute("disabled", "");
    document.querySelector(".js-cancel").setAttribute("disabled", "");
    $amountInput.value = "";
    $amountInput.setAttribute("disabled", "");

    delete $selectedToken.dataset.address;
    delete $selectedToken.dataset.decimals;
    delete $selectedToken.dataset.max;

    document.querySelector(".js-quote-container").innerHTML = "";
    document.querySelector(".js-amount-error").innerText = "";
}

document.querySelector(".js-submit").addEventListener("click", formSubmitted);
document.querySelector(".js-cancel").addEventListener("click", formCanceled);


//Coinpaprika API
async function getTop10Tokens(){
    const response = await fetch("https://api.coinpaprika.com/v1/coins")
    const tokens = await response.json();

    return tokens
        .filter(token => token.rank >= 1 && token.rank <= 50)
        .map(token => token.symbol);
}


//1 inch API with Moralis plugin
async function getTokenData(tickerList){
    const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
    });
    console.log(tokens);
    

    const tokenList = Object.values(tokens.tokens);

    return tokenList.filter(token => tickerList.includes(token.symbol));
}

function renderTokenDropdown(tokens){
    const options = tokens.map(token => 
        `<option value="${token.address}-${token.decimals}">${token.name} (${token.symbol})
        </option>`
    ).join("");

    document.querySelector(`[name=from-token]`).innerHTML = options;
    document.querySelector(`[name=to-token]`).innerHTML = options;
    document.querySelector(".js-submit-quote").removeAttribute("disabled");
}


getTop10Tokens()
    .then(getTokenData)
    .then(renderTokenDropdown);
    