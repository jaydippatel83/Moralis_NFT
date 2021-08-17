Moralis.initialize("HyiaYWWDyWtLkONVxqF78WH8DL0swohJMEJoMeRE");
Moralis.serverURL = 'https://rkunx2v3otvq.usemoralis.com:2053/server';
const TOKEN_CONTRACT_ADDRESS = "0x1D20188C30151119d6a3Acc6f3e7BbE3523CceD9";
const MARKETPLACE_CONTRACT_ADDRESS = "0x84Ba3a640Ae99245fdB2c7a1DD282b98c6e5Ddce";

init = async () => {
    hideElement(userInfo);
    hideElement(userItemsSection);
    hideElement(createItemForm);
    window.web3 = await Moralis.Web3.enable();
    window.tokenContract = new web3.eth.Contract(tokenContractAbi, TOKEN_CONTRACT_ADDRESS);
    window.marketplaceContract = new web3.eth.Contract(marketplaceContractAbi, MARKETPLACE_CONTRACT_ADDRESS);
    initUser();
    loadItems();

    const soldItemsQuery = new Moralis.Query('SoldItems');
    const soldItemsSubscription = await soldItemsQuery.subscribe();
    soldItemsSubscription.on('create', onItemSold);

    const itemsAddedQuery = new Moralis.Query('ItemsForSale');
    const itemsAddedSubscription = await itemsAddedQuery.subscribe();
    itemsAddedSubscription.on('create', onItemAdded);
}

onItemSold = async (item) => {
    const listing = document.getElementById(`item-${item.attributes.uid}`);
    if (listing) {
        listing.parentNode.removeChild(listing);
    }
    user = await Moralis.User.current();
    if (user) {
        const params = { uid: `${item.attributes.uid}` };
        const soldItem = await Moralis.Cloud.run('getItem', params);
        if (soldItem) {
            if (user.get('accounts').includes(item.attributes.buyer)) {
                getAndRenderItemData(soldItem, renderUserItem);
            }
            const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
            if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);

        }
    }
}

onItemAdded = async (item) => {

    const params = { uid: `${item.attributes.uid}` };
    const addedItem = await Moralis.Cloud.run('getItem', params);
    if (addedItem) {
        user = await Moralis.User.current();
        if (user) {
            if (user.get('accounts').includes(addedItem.ownerOf)) {
                const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
                if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);
                getAndRenderItemData(addedItem, renderUserItem);
                return;
            }
        }
        getAndRenderItemData(addedItem, renderItem);
    }
}

initUser = async () => {
    if (await Moralis.User.current()) {
        hideElement(userConnectButton);
        showElement(userProfileButton);
        showElement(openCreateItemButton);
        showElement(openUserItemsButton);
        loadUserItems();
    } else {
        hideElement(userProfileButton);
        showElement(userConnectButton);
        hideElement(openCreateItemButton);
        hideElement(openUserItemsButton);
    }
}

login = async () => {
    try {
        await Moralis.Web3.authenticate();
        initUser();
    } catch (error) {
        alert(error);
    }

}
openUserInfo = async () => {
    user = await Moralis.User.current();
    if (user) {
        const email = user.get('email');
        if (email) {
            userEmailField.value = email;
        } else {
            userEmailField.value = '';
        }
        userUsernameField.value = user.get('username');
        const userAvatar = user.get('avatar');
        if (userAvatar) {
            userAvatarImg.src = userAvatar.url();
            showElement(userAvatarImg);
        } else {
            hideElement(userAvatarImg);
        }
        showElement(userInfo);
    } else {
        login();
    }
}

logout = async () => {
    await Moralis.User.logOut();
    hideElement(userInfo);
    initUser();
}

saveUserInfo = async () => {
    user.set('email', userEmailField.value);
    user.set('username', userUsernameField.value);
    if (userAvatarFile.files.length > 0) {
        const avatar = new Moralis.File('avatar.jpg', userAvatarFile.files[0]);
        user.set('avatar', avatar);
    }
    await user.save();
    alert("User Info upload Sucessfully!!!");
    openUserInfo();
}

createItem = async () => { 
    if (createItemFile.files.length == 0) {
        alert("Please select a File1");
        return;
    } else if (createItemNameField.value.length == 0) {
        alert("Please give the Item a name!");
        return;
    }
    const nftFile = new Moralis.File("nftFile.jpg", createItemFile.files[0]);
    await nftFile.saveIPFS();

    const nftFilePath = nftFile.ipfs(); 

    const metadata = {
        name: createItemNameField.value,
        desciption: createItemDescriptionField.value,
        image: nftFilePath,

    };
    const nftFileMetadataFile = new Moralis.File("metadata.json", { base64: btoa(JSON.stringify(metadata)) });
    await nftFileMetadataFile.saveIPFS();

    const nftFileMetadataFilePath = nftFileMetadataFile.ipfs(); 
    const nftId = await mintNft(nftFileMetadataFilePath); 

    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');

    switch (createItemStatusField.value) {
        case "0":
            return;
        case "1":
            await ensureMarketplaceIsApproved(nftId, TOKEN_CONTRACT_ADDRESS);
            await marketplaceContract.methods.addItemToMarket(nftId, TOKEN_CONTRACT_ADDRESS, createItemPriceField.value).send({ from: userAddress });
            break;
        case "2":
            alert("Not Yet Supported");
            return;
    }
}

mintNft = async (metadatUrl) => {
    const reciept = await tokenContract.methods.createItem(metadatUrl).send({ from: ethereum.selectedAddress });
    console.log(reciept);
    return reciept.events.Transfer.returnValues.tokenId;
}

openUseritems = async () => {
    user = await Moralis.User.current();
    if (user) {
        showElement(userItemsSection);
    } else {
        login();
    }
}

loadUserItems = async () => {
    const ownedItems = await Moralis.Cloud.run("getUserItems");
    ownedItems.forEach(item => {
        const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
        if (userItemListing) return;
        getAndRenderItemData(item, renderUserItem);
    });
}

loadItems = async () => {
    const items = await Moralis.Cloud.run("getItems");
    user = await Moralis.User.current();
    items.forEach(item => {
        if (user) {
            if (user.attributes.accounts.includes(item.ownerof)) {
                const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
                if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);
                getAndRenderItemData(item, renderUserItem);
                return;
            }
        }
        getAndRenderItemData(item, renderItem);
    });
}

initTemplate = (id) => {
    const template = document.getElementById(id);
    template.id = "";
    template.parentNode.removeChild(template);
    return template;
}

renderItem = (item) => {
    const itemForSale = marketplaceItemTemplate.cloneNode(true);
    if (item.avatar) {
        itemForSale.getElementsByTagName("img")[0].src = item.sallerAvatar.url();
        itemForSale.getElementsByTagName("img")[0].alt = item.sallerUsername;
    }
    itemForSale.getElementsByTagName("img")[1].src = item.image;
    itemForSale.getElementsByTagName("img")[1].alt = item.name;
    itemForSale.getElementsByTagName("h5")[0].innerText = item.name;
    itemForSale.getElementsByTagName("p")[0].innerText = item.desciption;

    itemForSale.getElementsByTagName("button")[0].innerText = `Buy for ${item.askingPrice}`;
    itemForSale.getElementsByTagName("button")[0].onclick = () => buyItem(item);
    itemForSale.id = `item-${item.uid}`;
    itemsForSale.appendChild(itemForSale);
}

renderUserItem = async (item) => {
    const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
    if (userItemListing) return;

    const userItem = userItemTemplate.cloneNode(true);
    userItem.getElementsByTagName("img")[0].src = item.image;
    userItem.getElementsByTagName("img")[0].alt = item.name;
    userItem.getElementsByTagName("h4")[0].innerText = item.name;
    userItem.getElementsByTagName("p")[0].innerText = item.desciption;

    userItem.getElementsByTagName("input")[0].value = item.askingPrice ?? 1 ;
    userItem.getElementsByTagName("input")[0].disabled = item.askingPrice > 0 ;
    userItem.getElementsByTagName("button")[0].disabled = item.askingPrice > 0 ;
    userItem.getElementsByTagName("button")[0].onclick = async()=>{
        user = await Moralis.User.current();
        if(!user){
            login();
            return;
        }
        await ensureMarketplaceIsApproved(item.tokenId, item.tokenAddress);
        await marketplaceContract.methods.addItemToMarket(item.tokenId, item.tokenAddress, userItem.getElementsByTagName("input")[0].value).send({ from: user.get('ethAddress') });
    };

    userItem.id = `user-item-${item.tokenObjectId}`;
    userItems.appendChild(userItem);
}

getAndRenderItemData = (item, renderFunction) => {
    fetch(item.tokenUri)
        .then(response => response.json())
        .then(data => {
            item.name = data.name;
            item.desciption = data.desciption;
            item.image = data.image;
            renderFunction(item);
        });
}
ensureMarketplaceIsApproved = async (tokenId, tokenAddress) => {
    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');
    const contract = new web3.eth.Contract(tokenContractAbi, tokenAddress);
    const approvedAddress = await contract.methods.getApproved(tokenId).call({ from: userAddress });
    if (approvedAddress != MARKETPLACE_CONTRACT_ADDRESS) {
        await contract.methods.approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId).send({ from: userAddress });
    }
}

buyItem = async (item) => {
    user = await Moralis.User.current();
    if (!user) {
        login();
        return;
    }
    await marketplaceContract.methods.buyItem(item.uid).send({ from: user.get('ethAddress'), value: item.askingPrice });
}

hideElement = (element) => element.style.display = "none";
showElement = (element) => element.style.display = "block";

//user Info

const userConnectButton = document.getElementById('btnConnect');
userConnectButton.onclick = login;
const userProfileButton = document.getElementById('btnUserInfo');
userProfileButton.onclick = openUserInfo;

const userInfo = document.getElementById('userInfo');
const userUsernameField = document.getElementById('txtUsername');
const userEmailField = document.getElementById('txtEmail');
const userAvatarImg = document.getElementById('imgAvatar');
const userAvatarFile = document.getElementById('fileAvatar');

document.getElementById('btnCloseUserInfo').onclick = () => hideElement(userInfo);
document.getElementById('btnlogout').onclick = logout;
document.getElementById('btnSaveUserInfo').onclick = saveUserInfo;

//create item

const createItemForm = document.getElementById('createItem');
const createItemNameField = document.getElementById('txtCreateItemName');
const createItemDescriptionField = document.getElementById('txtCreateItemDescrition');
const createItemPriceField = document.getElementById('numberCreateItemPrice');
const createItemStatusField = document.getElementById('selectCreateItemStatus');
const createItemFile = document.getElementById('fileCreateItemFile');


const openCreateItemButton = document.getElementById('btnOpenCreateItem');
openCreateItemButton.onclick = () => showElement(createItemForm);
document.getElementById('btnCloseCreateItem').onclick = () => hideElement(createItemForm);
document.getElementById('btnCreateItem').onclick = createItem;

//user Items


const userItemsSection = document.getElementById('userItems');
const userItems = document.getElementById('userItemsList');
document.getElementById('btnCloseUserItems').onclick = () => hideElement(userItemsSection);
const openUserItemsButton = document.getElementById('btnMyItems');
openUserItemsButton.onclick = openUseritems;

const userItemTemplate = initTemplate("itemTemplate");

const marketplaceItemTemplate = initTemplate("marketplaceItemTemplate");

//Items for sale
const itemsForSale = document.getElementById('itemsForSale');



init();