/* Chatrajnorak narrative content — editable authoring layer.
 * World premises from Soul • S.I.C.K. handoff are established.
 * Survivor dialogue, personalities and encounter details here are PROVISIONAL
 * development fiction, editable before title-specific canon approval.
 * Testimony is not an objective record of the catastrophe.
 */
'use strict';
window.ChatrajnorakFiction = Object.freeze({
  setting: {
    opening: 'Twenty years after the networks went dark, people still gathered wherever a roof held, a well ran clear, and somebody kept watch.',
    promise: 'THE WORLD ENDED. WE DID NOT.',
    settlement: 'There is no crown here, only responsibility. They call the one who keeps the gates open Our Leader.',
    chronicle: 'These pages remember what happened to the settlement. What its people remember of the world before is another matter.'
  },
  encounterOrder: ['westRoad', 'relayCrossing'],
  encounters: {
    westRoad: {
      id: 'west_road', name: 'The Western Approach',
      survivalRule: 'enemy_count_below', maxEnemyPieces: 2,
      shortGuidance: 'Escape if two or fewer enemy pieces remain when Our Leader is checkmated.',
      deployGuidance: 'The western road is narrow. If Our Leader is checkmated while vulnerable, escape is possible ONLY if fewer than three enemy pieces remain on the board, including their King.',
      firstMoveGuidance: 'The watch signals the same warning: reduce the raiders to two pieces or fewer before checkmate, or Our Leader has no route out.',
      firstMoveShort: 'Scouts: leave at most two enemy pieces on the board, counting their King.',
      title: 'THE WESTERN APPROACH',
      scene: 'The road to the settlement runs between abandoned culverts and a long-dead signal tower. Somebody has been collecting tolls from the hungry.',
      threat: 'The Brotherhood of the Final Shadow',
      speaker: 'Raider at the barricade',
      openingLine: '“A toll for the road. Food, tools, something that still works. You decide how polite this gets.”',
      options: [
        {id:'peace',label:'Offer shared passage', reply:'“You can eat with us,” Our Leader says. The raider glances at the others. “We didn’t come here to be guests.”'},
        {id:'costume',label:'Question their authority', reply:'“Who appointed you keeper of this road?” For a moment the raider seems almost embarrassed. Then somebody behind the barricade draws steel.'}
      ],
      preparation: 'The barricade is not a border. It is a decision somebody made about who gets through.',
      victory: 'The road opens. The raiders withdraw from the broken signal tower. Travelers may pass again, at least for a while.',
      defeat: 'The barricade holds. The settlement must reckon with an enemy still controlling its western approach.',
      death: 'The western road takes Our Leader. The settlement will have to tell this story without them.',
      enemies: [
        ['K',0,4,'west-king'],['R',0,0,'west-rook'],['B',0,2,'west-bishop'],['N',0,6,'west-knight'],
        ['P',1,1,'west-pawn-b'],['P',1,3,'west-pawn-d'],['P',1,4,'west-pawn-e'],['P',1,5,'west-pawn-f'],['P',1,6,'west-pawn-g']
      ]
    },
    relayCrossing: {
      id: 'relay_crossing', name: 'The Relay Crossing',
      survivalRule: 'remove_targets', targetIds: ['relay-queen','relay-knight'],
      shortGuidance: 'Escape if the enemy Queen and Knight are both captured before checkmate.',
      deployGuidance: 'A commander and a mounted scout control the crossing. If Our Leader is checkmated while vulnerable, survival requires BOTH the enemy Queen and enemy Knight to have been captured before the battle ends.',
      firstMoveGuidance: 'The lookouts are certain: defeat can be survived only if the enemy Queen AND Knight are removed. Eliminating just one will not open an escape.',
      firstMoveShort: 'Lookouts: the enemy Queen AND Knight must both fall before checkmate.',
      title: 'THE RELAY CROSSING',
      scene: 'A footbridge carries what remains of a road across a drainage cut. Beyond it, an old relay cabinet has been converted into a lookout post. Two enemy figures coordinate the patrols.',
      threat: 'The Crossing Guard',
      speaker: 'Voice from the far bank',
      openingLine: '“The crossing is closed until we know what you carry. Keep your hands where we can see them.”',
      options: [
        {id:'peace',label:'Ask for passage', reply:'Our Leader asks for a safe crossing. The response comes through a battered speaking horn: “You should have sent word yesterday.”'},
        {id:'costume',label:'Demand an explanation', reply:'“Who owns a bridge that everyone needs?” Our Leader calls back. A whistle answers, followed by the sound of people taking their positions.'}
      ],
      preparation: 'The opposing commander and scout direct the crossing. Break their coordination, and even a defeated force might get away.',
      victory: 'The crossing is secured. A route between scattered communities becomes possible again.',
      defeat: 'The crossing remains in enemy hands. The settlement has lost access to a route it badly needed.',
      death: 'The crossing becomes the last place Our Leader was seen. The people waiting at home receive no return signal.',
      enemies: [
        ['K',0,4,'relay-king'],['Q',0,3,'relay-queen'],['N',0,6,'relay-knight'],['R',0,0,'relay-rook'],
        ['B',0,5,'relay-bishop'],['P',1,1,'relay-pawn-b'],['P',1,2,'relay-pawn-c'],
        ['P',1,3,'relay-pawn-d'],['P',1,5,'relay-pawn-f'],['P',1,6,'relay-pawn-g']
      ]
    }
  },
  // tiers: intro available immediately; present at XP 1; recollection at XP 3.
  survivors: {
    'start-p1': {id:'start-p1',name:'June',age:'about 28',type:'P',origin:'the old cannery',history:'June once organized a food line in a blackout.',
      concern:'June keeps asking how much food the settlement can share before its own stores run short.',
      intro:'“A line is just a promise that whoever is at the back still matters,” June says. “I want to know if we mean it.”',
      present:'“People argue at the food stores when they cannot see the whole count. I would rather show them the numbers than ask them to trust a smile.”',
      past:'“We had one lantern and a dozen people waiting outside the cannery. I started a food line because nobody else could bear telling them who came first.”'},
    'start-p2': {id:'start-p2',name:'Penny',age:'about 51',type:'P',origin:'the pharmacy queue',history:'Penny knows exactly how to make a tomato grow in a tire.',
      concern:'Penny wants planting space before the next caravan brings another mouth to feed.',
      intro:'“Give me dirt that still holds water and I’ll give you an argument for staying,” Penny says.',
      present:'“The seedlings are doing fine. It’s the people stepping over them I worry about. We need somewhere no one mistakes a garden for vacant ground.”',
      past:'“That first tire garden was an accident. I had soil, a split seed packet, and nowhere to put either. Then something green had the nerve to grow.”'},
    'start-p3': {id:'start-p3',name:'Dax',age:'about 19',type:'P',origin:'the train overpass',history:'Dax helped teach younger children chess with scavenged pieces after the collapse.',
      concern:'Dax is trying to make a place for younger survivors who have never known anything but makeshift homes.',
      intro:'“I can keep watch,” Dax says too quickly. “And I can teach the kids the board. I know both.”',
      present:'“They keep asking if the old world had games. Imagine being young enough to think chess was invented beside a burn barrel.”',
      past:'“The pieces were bottle tops and bits of wire. We painted the Kings twice because everybody kept stealing them to play something else.”'},
    'start-p4': {id:'start-p4',name:'Mika',age:'about 34',type:'P',origin:'a derelict greenhouse',history:'Mika never returned a borrowed book, but remembers every word.',
      concern:'Mika is collecting working vocabulary for things younger settlers have never seen.',
      intro:'“I can remember the instructions,” Mika says. “That isn’t the same as knowing what they meant.”',
      present:'“Someone asked me what a server was. I said it could be a person or a room full of humming boxes. They thought I was joking.”',
      past:'“I carried a library book from shelter to shelter for years. I was afraid that once the words were gone, nobody would believe the things they described.”'},
    'start-p5': {id:'start-p5',name:'Al',age:'about 63',type:'P',origin:'the relief station',history:'Al repaired radios for people who could not pay.',
      concern:'Al is trying to repair a receiver whose owner waits every evening for a voice that may never come.',
      intro:'“Don’t throw that set away,” Al says. “A quiet radio isn’t necessarily a dead one.”',
      present:'“I keep fixing the receivers. Not because they always work, but because someone always has a reason to listen.”',
      past:'“A woman came to the relief station with a radio and no payment. It took me all night to get the speaker working. She cried when the static came through.”'},
    'start-n1': {id:'start-n1',name:'Ro',age:'about 26',type:'N',origin:'the bus depot',history:'Ro once crossed three counties carrying medicine by bicycle.',
      concern:'Ro believes the settlement is letting the routes between its neighbors disappear.',
      intro:'“A road you stop using belongs to whoever scares you off it,” Ro says, checking the bicycle chain.',
      present:'“I’d rather spend a day on the road than a week waiting to hear whether the other settlement has fever medicine.”',
      past:'“Three counties for a bag of medicine. I remember every hill. What I don’t remember is thinking I had a choice.”'},
    'start-n2': {id:'start-n2',name:'Yarrow',age:'about 46',type:'N',origin:'the library steps',history:'Yarrow used to teach people to drive.',
      concern:'Yarrow wants a safe place to teach navigation and travel to those who cannot read the old road signs.',
      intro:'“You can know the route and still get lost,” Yarrow says. “Come back. We’ll try it from the beginning.”',
      present:'“People assume I miss cars. Sometimes I miss being able to say we will be there by five and believe it.”',
      past:'“I taught people to drive before the roads emptied. The strangest lesson now is telling a young traveler why the lanes were painted.”'},
    'start-b1': {id:'start-b1',name:'Vale',age:'about 37',type:'B',origin:'an empty chapel',history:'Vale kept a candle burning for anyone, believer or otherwise.',
      concern:'Vale is looking for a room where mourners can gather without being questioned about what they believe.',
      intro:'“The door can be open without anyone agreeing on what lies beyond it,” Vale says.',
      present:'“You’d be surprised how many people ask permission to grieve. I wish there were somewhere they didn’t have to.”',
      past:'“We kept one candle burning in the chapel. Sometimes it was prayer. Sometimes it was just proof somebody had stayed awake.”'},
    'start-b2': {id:'start-b2',name:'Dee',age:'about 22',type:'B',origin:'the riverside market',history:'Dee learned the old city from conflicting maps and the stories of people who remembered it.',
      concern:'Dee wants to compare survivors’ maps before a wrong shortcut gets somebody killed.',
      intro:'“Every map lies a little,” Dee says. “But if you put three liars together, you might find a street.”',
      present:'“A trader says the passage under the river is still dry. Someone else swears there was never a passage. That’s why I write down who told me.”',
      past:'“I was little when it happened. I remember the stories people told afterward better than the streets. That isn’t the same as remembering the city.”'},
    'start-r1': {id:'start-r1',name:'Brick',age:'about 43',type:'R',origin:'the brickworks',history:'Brick built the fence that keeps the school warm.',
      concern:'Brick wants to repair the school fence before winter wind strips the insulation away.',
      intro:'“Nobody comes here looking for a perfect wall,” Brick says. “They come looking for one that holds.”',
      present:'“The school is warm because six people carried scraps until their backs hurt. Make sure the children know that.”',
      past:'“I built the first fence too close to the drainage channel. The rain took half of it. I came back and laid the posts again.”'},
    'start-r2': {id:'start-r2',name:'Jo',age:'about 31',type:'R',origin:'the north gate',history:'Jo once helped people evacuate under fire.',
      concern:'Jo insists the north gate needs a retreat plan, not just stronger hinges.',
      intro:'“A gate isn’t safe because it closes,” Jo says. “It’s safe if people know where to go when it fails.”',
      present:'“Show me which children cannot run, which carts have bad wheels, and who will go back for the others. Then we have a plan.”',
      past:'“We got the last family out. I remember thinking that made it a success. Then someone asked who had been left to open the gate.”'},
    'start-q1': {id:'start-q1',name:'Mercy',age:'about 39',type:'Q',origin:'the old courthouse',history:'Mercy helped settle disputes when nobody trusted the courts.',
      concern:'Mercy worries that the settlement has rules but no agreed way to challenge them.',
      intro:'“Before you ask me to keep order,” Mercy says, “tell me who can tell Our Leader they’re wrong.”',
      present:'“If nobody can appeal a decision, you haven’t built peace. You’ve built a pause between arguments.”',
      past:'“The courthouse stayed standing long after people stopped bringing cases. We heard disputes under the steps because no one would sit in the old judge’s chair.”'}
  },
  recruitNames: ['Tess','Crow','Nina','Oz','Moss','Pip','Ellis','Dove','Kit','Wren','Sal','Rory','Ash','Bex','Milo','Lux','Dana','Juno','Bo','Cass','Liv','Gus'],
  recruitPlaces: ['the flooded laundromat','the broken bus stop','the free clinic','the last open diner','an overturned library van','a community garden','the west checkpoint'],
  recruitHistories: ['They spent a winter keeping a neighborhood boiler alive.','They worked a hospital night shift in the difficult years.','They remember where the missing school books went.','They learned chess with bottle caps and chalk.','They have family beyond the southern fence.','They used to fix bicycles for a living.','They can name every bird that survived the fires.'],
  arrivals: [
    'A traveler reaches the gate with a bedroll worn almost transparent. They ask first whether anyone here shares meals.',
    'Someone arrives carrying a bundle of tools wrapped like a newborn. They say they can work; they would rather know whether they can stay.',
    'A tired stranger asks who is responsible for the people inside the fence. They wait for an answer before giving their name.'
  ]
});
