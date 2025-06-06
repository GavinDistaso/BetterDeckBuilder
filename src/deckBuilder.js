window.deckList = [];

let _deckName = undefined;

Object.defineProperty(window, 'deckName', {
    get: () => { return _deckName; },
    set: (v) => {
        _deckName = v;

        document.getElementById('deckName').innerText = v;
    }
})

window.deckName = 'Untitled Deck';

document.getElementById('editDeckName').addEventListener('click', ()=>{
    window.deckName = prompt('Input New Deck Name: ', window.deckName);
});

const deckListsElement = document.getElementById('deckList');

function addCardToDeckList(card, count=1){
    for(let i = 0; i < window.deckList.length; i++){
        let cardEntry = window.deckList[i];

        if(!cardEntry || !cardEntry.card) continue;

        if(cardEntry.card.name == card.name){
            cardEntry.count += count;

            if(cardEntry.count <= 0){
                window.deckList.splice(i, 1);
            }

            drawDeckList();
            return;
        }
    }

    // if card not found in deck list
    if(count > 0){
        window.deckList.push({
            count: count,
            card: card
        });
    }

    drawDeckList();
}

function drawDeckList(deck = window.deckList){
    let catagorisedDeckList = {};

    console.log(deck);

    let totalDeckPrice = 0;
    let cardCount = 0;

    deck.forEach(cardEntry => {
        if(!cardEntry) return;

        let count = cardEntry.count;
        let card = cardEntry.card;

        if(!card) return;

        let categoryType = card.types.join(' ');

        if(!catagorisedDeckList[categoryType])
            catagorisedDeckList[categoryType] = [];

        catagorisedDeckList[categoryType].push(cardEntry);

        totalDeckPrice += card.price * count;
        cardCount += count;
    });

    document.getElementById('deckCountPrice').innerText = 
        `${cardCount} Cards : \$${totalDeckPrice.toFixed(2)}`;

    //

    deckListsElement.innerHTML = '';

    Object.entries(catagorisedDeckList).forEach(([category, cards]) => {
        let categoryElement = document.createElement('tr');
        categoryElement.innerHTML = `<td colspan='7'><h2>${category}</h2></td>`;

        deckListsElement.appendChild(categoryElement);

        // Create List

        cards.forEach(cardEntry => {
            let count = cardEntry.count;
            let card = cardEntry.card;

            let cardElement = document.createElement('tr');

            cardElement.innerHTML = 
            `
                <td content='count'>${count}</td>
                <td content='set'>${card.setCode}</td>
                <td content='name'>${card.name}</td>
                <td content='type'>${card.type}</td>
                <td content='price'>\$${nullSafty(card.price, '?')}</td>
                <td content='colorId'>${colorIdentityListToHTML(card.colorIdentity.split(', '))}</td>
                <td content='addRemove'>
                    <div icon='remove' id='removeCard'></div>
                    <div icon='add' id='addCard'></div>
                </td>
            `;

            cardElement.querySelector('#removeCard').addEventListener('click', ()=>{
                addCardToDeckList(card, -1);
            });

            cardElement.querySelector('#addCard').addEventListener('click', ()=>{
                addCardToDeckList(card, 1);
            });

            cardElement.addEventListener('click', ()=>{
                inspectCard(cardEntry.card);
            });

            deckListsElement.appendChild(cardElement);
        });

    });
}

function alertUnfoundCards(unfoundCards){
    unfoundCards.forEach(entry => {
        let warning = document.createElement('div');
        warning.innerHTML = `
            <div>
            Card not found<br>
            Card: ${entry.name},
                from set: ${entry.set}. <br>
                there were ${entry.count} of these requested. <br>
            </div>
        `;

        document.getElementById('warnings').appendChild(warning);

        console.warn(`Entry not found: ${JSON.stringify(entry)}`);
    });
}

function downloadFile(text, fileName){
    const file = new File([text], fileName, {
        type: 'text/plain'
    });

    const url = URL.createObjectURL(file);

    const link = document.createElement('a');

    link.href = url;
    link.download = file.name;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
}

document.getElementById('downloadText').addEventListener('click', ()=>{
    let output = '';

    window.deckList.forEach(cardEntry => {
        output += `${cardEntry.count} ${cardEntry.card.name} [${cardEntry.card.setCode}]\n`;
    });

    downloadFile(output, `${window.deckName}.txt`);
});

async function loadTextList(deck){
    let lines = deck.split('\n');

    let newDeckList = [];
    let unfoundCards = [];

    for(let i = 0; i < lines.length; i++){
        let line = lines[i];

        let components = line.trim().split(' ');

        let count = parseInt(components[0]);

        //

        let setMatch = line.match(new RegExp('\\[(\\w*)\\]'), 'g');
        let set = null;

        if(setMatch){
            set = setMatch[1].toUpperCase();
        }

        //
        
        let name = null;

        if(set)
            name = components.slice(1, -1).join(' ');
        else
            name = components.slice(1).join(' ');

        if(count != NaN && name.length > 0){
            let cardEntry = {
                count: count,
                card: await findCard(name, set)
            };

            if(cardEntry.card){
                newDeckList.push(cardEntry);
            }else{
                unfoundCards.push({
                    count: count,
                    name: name,
                    set: set
                });
            }
        }
    }

    return [newDeckList, unfoundCards];
}

document.getElementById('loadTextFile').addEventListener('click', ()=>{
    let input = document.createElement("input");
    
    input.type = "file";
    input.setAttribute("multiple", false);
    input.setAttribute("accept", "*/*");

    input.onchange = async function (event) {
        console.log(this.files[0])

        let name = this.files[0].name.split('.')[0];

        let content = await this.files[0].text();

        let [newDeck, unfoundCards] = await loadTextList(content);

        window.deckList = newDeck;

        window.deckName = name;

        window.accountCollectionID = null;

        drawDeckList();

        alertUnfoundCards(unfoundCards);
    }

    input.click();
});

document.getElementById('clearDeck').addEventListener('click', ()=>{
    let deleteConfirm = confirm('Are you sure you wish to delete this deck?');
    
    if(deleteConfirm){
        window.deckList = [];
        window.deckName = 'Untitled Deck';
        window.accountCollectionID = null;

        drawDeckList();
    }
});

document.getElementById('bargainBin').addEventListener('click', async ()=>{
    let cardSearchPromises = [];

    for(let i = 0; i < window.deckList.length; i++){
        let card = window.deckList[i].card;

        cardSearchPromises.push((async ()=>{
            window.deckList[i].card = await findCard(card.name, null, 'price');
        })());
    }

    await Promise.all(cardSearchPromises);

    drawDeckList();
});

// Account collection saving & loading

async function deckListToAccountCollectionObject(deck){
    let collection = [];

    deck.forEach(cardEntry => {
        collection.push({
            n: cardEntry.count,
            id: cardEntry.card.uuid
        })
    });

    return collection;
}

async function loadAccountCollectionObjectToDeckList(collection){
    let deckList = [];

    for(const cardEntry of collection){
        let card = await getCardByUUID(cardEntry.id);

        deckList.push({
            count: cardEntry.n,
            card: card
        })
    }

    return deckList;
}

const accountLoadDropdownContent = document.getElementById('accountLoadDropdownContent')
const accountSave = document.getElementById('accountSaveCollection')

async function updateAccountCollectionLoadDropdown(){
    [...accountLoadDropdownContent.children].forEach(child => {
        child.remove();
    });

    if(!window.user && !await attemptGetUser()){
        return;
    }

    let [success, msg, collections] = await makeApiRequest('collectionList', 'GET');

    if(!success){
        alert(`An error has occured: '${msg}'`);
    }

    collections.forEach(async collection => {
        console.log(collection)

        let elem = document.createElement('div')
        elem.innerText = collection.name;

        elem.addEventListener('click', async ()=>{
            let deckList = await loadAccountCollectionObjectToDeckList(collection.collection)

            window.deckList = deckList;
            window.deckName = collection.name;

            drawDeckList();
        });

        accountLoadDropdownContent.appendChild(elem);
    })
}

document.addEventListener('DOMContentLoaded', async function() {
    await updateAccountCollectionLoadDropdown();
});

accountSave.addEventListener('click', async ()=>{
    if(!window.user && !await attemptGetUser()){
        return;
    }

    let collection = await deckListToAccountCollectionObject(window.deckList);

    let obj = {name: window.deckName, collection: collection};
    let [success, msg, _] = await makeApiRequest('/collectionUpdate', 'POST', JSON.stringify(obj))

    if(success){
        alert('New collection saved to profile!');
    }else if(confirm("Are you sure you wish to overwrite your existing collection?")){
        [success, msg, _] = await makeApiRequest('/collectionUpdate', 'PUT', JSON.stringify(obj))

        if(success){
            alert('Collection overwritted to profile!');
        } else {
            alert(`An error has occured: '${msg}'`);
        }
    }

    await updateAccountCollectionLoadDropdown();
})
