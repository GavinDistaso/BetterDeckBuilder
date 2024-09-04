const selectColumns = [
    'artist',
    'availability',
    'cardParts',
    'colorIdentity',
    'colorIndicator',
    'colors',
    'defense',
    'life',
    'loyalty',
    'layout',
    'manaCost',
    'manaValue',
    'name',
    'number',
    'otherFaceIds',
    'power',
    'printings',
    'rarity',
    'setCode',
    'side',
    'subsets',
    'subtypes',
    'supertypes',
    'text',
    'toughness',
    'type',
    'types',
    //'uuid',
    'variations',

    // From Identifiers table
    //'scryfallId',

    // From cardPurchaseUrls table,
    'cardKingdom',
    'cardMarket',
    'tcgPlayer',

    // From Scry
    'price',
    'image',
    'releaseDate'
];

async function initCard(db, dbEntry, columns = selectColumns){
    let card = {};

    columns.forEach((entry, i) => {
        card[entry] = dbEntry[i];
    });

    card.printings = card.printings.split(', ')
    card.types = card.types.split(', ')
    card.subtypes = card.subtypes.split(', ')
    card.supertypes = card.supertypes.split(', ')
    card.availability = card.availability.split(', ')

    if(card.side == 'b' && (card.layout == 'transform' || card.layout == 'convert' || card.layout == 'modal_dfc' )){
        card.image = card.image.replace('[side]', 'back');
    }else{
        card.image = card.image.replace('[side]', 'front');
    }

    return card;
}
