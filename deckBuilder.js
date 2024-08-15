let deckList = [];

const deckListsElement = document.getElementById('deckList');

function addCardToDeckList(card, count=1){
    for(let i = 0; i < deckList.length; i++){
        let cardEntry = deckList[i];

        if(cardEntry.card.name == card.name){
            cardEntry.count += count;

            if(cardEntry.count <= 0){
                deckList.splice(i, 1);
            }

            drawDeckList();
            return;
        }
    }

    // if card not found in deck list
    if(count > 0){
        deckList.push({
            count: count,
            card: card
        });
    }

    drawDeckList();
}

function drawDeckList(){
    let catagorisedDeckList = {};

    deckList.forEach(cardEntry => {
        let count = cardEntry.count;
        let card = cardEntry.card;

        let categoryType = card.types.join(' ');

        if(!catagorisedDeckList[categoryType])
            catagorisedDeckList[categoryType] = [];

        catagorisedDeckList[categoryType].push(cardEntry);
    });

    console.log(catagorisedDeckList);

    //

    deckListsElement.innerHTML = '';

    Object.entries(catagorisedDeckList).forEach(([category, cards]) => {
        let categoryElement = document.createElement('tr');
        categoryElement.innerHTML = `<td colspan='6'><h2>${category}</h2></td>`;

        deckListsElement.appendChild(categoryElement);

        // Create List

        cards.forEach(cardEntry => {
            let count = cardEntry.count;
            let card = cardEntry.card;

            let cardElement = document.createElement('tr');

            cardElement.innerHTML = 
            `
                <td content='count'>${count}</td>
                <td content='name'>${card.name}</td>
                <td content='type'>${card.type}</td>
                <td content='price'>\$${nullSafty(card.price, '?')}</td>
                <td content='colorId'>${card.colorIdentity}</td>
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

            deckListsElement.appendChild(cardElement);
        });

    });
}

document.getElementById('downloadText').addEventListener('click', ()=>{
    let output = '';

    deckList.forEach(cardEntry => {
        output += `${cardEntry.count} ${cardEntry.card.name} [${cardEntry.card.setCode}]\n`;
    });

    const file = new File([output], 'deck.txt', {
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
});
