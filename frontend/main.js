Moralis.initialize("HyiaYWWDyWtLkONVxqF78WH8DL0swohJMEJoMeRE");
Moralis.serverURL = 'https://rkunx2v3otvq.usemoralis.com:2053/server';
const TOKEN_CONTRACT_ADDRESS = "0xE403dFD97304269Bb481f914111295f68A0b89Ae"; 

init = async () => {
    hideElement(userInfo);
    hideElement(createItemForm);
    window.web3 = await Moralis.Web3.enable();
    window.tokenContract = new web3.eth.Contract(tokenContractAbi,TOKEN_CONTRACT_ADDRESS);
    initUser();
}

initUser = async () => {
    if (await Moralis.User.current()) {
        hideElement(userConnectButton);
        showElement(userProfileButton);
        showElement(openCreateItemButton);
    } else {
        hideElement(userProfileButton);
        showElement(userConnectButton);
        hideElement(openCreateItemButton);

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
    alert("click work")
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
    const nftFileHash = nftFile.hash();

    const metadata = {
        name: createItemNameField.value,
        desciption: createItemDescriptionField.value,
        image: nftFilePath,
       
    };
    const nftFileMetadataFile = new Moralis.File("metadata.json", { base64: btoa(JSON.stringify(metadata)) });
    await nftFileMetadataFile.saveIPFS();

    const nftFileMetadataFilePath = nftFileMetadataFile.ipfs();
    const nftFileMetadataFileHash = nftFileMetadataFile.hash();

    const nftId = await mintNft(nftFileMetadataFilePath);


    const Item = Moralis.Object.extend("Item");

    //create a new instance of the class
    const item = new Item();
    item.set('name', createItemNameField.value);
    item.set('description', createItemDescriptionField.value);
    item.set('nftFilePath', nftFilePath);
    item.set('nftFileHash', nftFileHash);
    item.set('metadataFilePath', nftFileMetadataFilePath);
    item.set('metadataFileHash', nftFileMetadataFileHash); 
    item.set('nftId',nftId);
    item.set('nftContractAddress',TOKEN_CONTRACT_ADDRESS);
    await item.save();
    console.log(item);
}

mintNft = async (metadatUrl)=>{
    const reciept = await tokenContract.methods.createItem(metadatUrl).send({from: ethereum.selectedAddress});
    console.log(reciept);
    return reciept.events.Transfer.returnValues.tokenId;
}

hideElement = (element) => element.style.display = "none";
showElement = (element) => element.style.display = "block";

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




init();