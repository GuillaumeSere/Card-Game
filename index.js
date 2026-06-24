const cardObjectDefinitions = [
    { id: 1, name: "Roi de coeur", imagePath: "./images/card-KingHearts.png" },
    { id: 2, name: "Valet de trefle", imagePath: "./images/card-JackClubs.png" },
    { id: 3, name: "Dame de carreau", imagePath: "./images/card-QueenDiamonds.png" },
    { id: 4, name: "As de pique", imagePath: "./images/card-AceSpades.png" }
]

const aceId = 4
const cardBackImgPath = "./images/card-back-Blue.png"
const localStorageGameKey = "HTA"

const roundPreviewMs = 1800
const flipBeforeShuffleMs = 750
const choiceRevealDelayMs = 1400
const nextRoundDelayMs = 2600
const cardFlipStaggerMs = 120
const shuffleAnimationMs = 560
const shuffleStepMs = 700
const shuffleSteps = 12

let cards = []
let cardPositions = []
let gameInProgress = false
let shufflingInProgress = false
let cardsRevealed = false
let roundNum = 0
let maxRounds = 4
let score = 0
let gameObj = {}

const playGameButtonElem = document.getElementById("playGame")
const cardContainerElem = document.querySelector(".card-container")
const currentGameStatusElem = document.querySelector(".current-status")
const scoreContainerElem = document.querySelector(".header-score-container")
const scoreElem = document.querySelector(".score")
const roundContainerElem = document.querySelector(".header-round-container")
const roundElem = document.querySelector(".round")

const numCards = cardObjectDefinitions.length

const winColor = "#147a3b"
const loseColor = "#b91c1c"
const primaryColor = "#ffffff"

loadGame()

function loadGame() {
    createCards()
    cards = document.querySelectorAll(".card")

    setCardsInteractive(false)
    cardFlyInEffect()
    playGameButtonElem.addEventListener("click", () => startGame())

    updateStatusElement(scoreContainerElem, "none")
    updateStatusElement(roundContainerElem, "none")
}

function startGame() {
    initializeNewGame()
    startRound()
}

function initializeNewGame() {
    score = 0
    roundNum = 0

    checkForIncompleteGame()
    resetCardPositions()
    clearCardFeedback()
    flipCards(false)

    shufflingInProgress = false

    updateStatusElement(scoreContainerElem, "flex")
    updateStatusElement(roundContainerElem, "flex")
    updateStatusElement(scoreElem, "block", primaryColor, `Score <span class="badge">${score}</span>`)
    updateStatusElement(roundElem, "block", primaryColor, `Manche <span class="badge">${roundNum}</span>`)
}

function checkForIncompleteGame() {
    const serializedGameObj = getLocalStorageItemValue(localStorageGameKey)

    if (!serializedGameObj) {
        return
    }

    gameObj = getObjectFromJSON(serializedGameObj)

    if (gameObj.round >= maxRounds) {
        removeLocalStorageItem(localStorageGameKey)
        return
    }

    if (confirm("Voulez-vous reprendre votre derniere partie ?")) {
        score = gameObj.score
        roundNum = gameObj.round
    }
}

function startRound() {
    initializeNewRound()
    setTableState("previewing")
    updateStatusElement(currentGameStatusElem, "block", primaryColor, "Mémorisez l'As de pique...")

    setTimeout(() => {
        flipCards(true)
        updateStatusElement(currentGameStatusElem, "block", primaryColor, "Suivez bien les cartes...")

        setTimeout(() => {
            shuffleCards()
        }, flipBeforeShuffleMs)
    }, roundPreviewMs)
}

function initializeNewRound() {
    roundNum++
    playGameButtonElem.disabled = true

    gameInProgress = true
    shufflingInProgress = true
    cardsRevealed = false

    clearCardFeedback()
    setCardsInteractive(false)
    updateStatusElement(roundElem, "block", primaryColor, `Manche <span class="badge">${roundNum}</span>`)
}

function shuffleCards() {
    let shuffleCount = 0
    setTableState("shuffling")

    const intervalId = setInterval(() => {
        const [firstId, secondId] = getTwoDifferentCardIds()
        animateShuffle(firstId, secondId)
        shuffleCount++

        if (shuffleCount >= shuffleSteps) {
            clearInterval(intervalId)
            setTimeout(() => {
                finishShuffle()
            }, shuffleAnimationMs)
            return
        }
    }, shuffleStepMs)
}

function finishShuffle() {
    shufflingInProgress = false
    clearShuffleStyles()
    setCardsInteractive(true)
    setTableState("choosable")
    updateStatusElement(currentGameStatusElem, "block", primaryColor, "À vous : cliquez sur l'As de pique.")
}

function chooseCard(card) {
    if (!canChooseCard()) {
        return
    }

    cardsRevealed = true
    setCardsInteractive(false)
    setTableState("revealed")

    const hit = evaluateCardChoice(card)
    markSelectedCard(card, hit)
    saveGameObjectToLocalStorage(score, roundNum)
    flipCard(card, false)

    setTimeout(() => {
        flipCards(false)
        highlightAceCard()
        updateStatusElement(currentGameStatusElem, "block", primaryColor, "Voici les positions des cartes.")
        endRound()
    }, choiceRevealDelayMs)
}

function canChooseCard() {
    return gameInProgress && !shufflingInProgress && !cardsRevealed
}

function evaluateCardChoice(card) {
    const hit = Number(card.id) === aceId

    if (hit) {
        updateScore()
        outputChoiceFeedBack(true)
    } else {
        outputChoiceFeedBack(false)
    }

    return hit
}

function outputChoiceFeedBack(hit) {
    if (hit) {
        updateStatusElement(currentGameStatusElem, "block", winColor, "Bien joué !")
        return
    }

    updateStatusElement(currentGameStatusElem, "block", loseColor, "Manqué !")
}

function endRound() {
    setTimeout(() => {
        if (roundNum === maxRounds) {
            gameOver()
            return
        }

        startRound()
    }, nextRoundDelayMs)
}

function gameOver() {
    updateStatusElement(scoreContainerElem, "none")
    updateStatusElement(roundContainerElem, "none")
    updateStatusElement(
        currentGameStatusElem,
        "block",
        primaryColor,
        `Partie terminée ! Score final : <span class="badge">${score}</span>. Cliquez sur Jouer pour recommencer.`
    )

    setCardsInteractive(false)
    setTableState("")
    gameInProgress = false
    playGameButtonElem.disabled = false
}

function calculateScoreToAdd(currentRound) {
    if (currentRound === 1) {
        return 100
    }

    if (currentRound === 2) {
        return 50
    }

    if (currentRound === 3) {
        return 25
    }

    return 10
}

function calculateScore() {
    score += calculateScoreToAdd(roundNum)
}

function updateScore() {
    calculateScore()
    updateStatusElement(scoreElem, "block", primaryColor, `Score <span class="badge">${score}</span>`)
}

function updateStatusElement(elem, display, color, innerHTML) {
    elem.style.display = display

    if (arguments.length > 2) {
        elem.style.color = color
        elem.innerHTML = innerHTML
    }
}

function transformGridArea(areas) {
    cardContainerElem.style.gridTemplateAreas = areas
}

function flipCard(card, flipToBack) {
    const innerCardElem = card.firstElementChild

    if (flipToBack && !innerCardElem.classList.contains("flip-it")) {
        innerCardElem.classList.add("flip-it")
        return
    }

    if (!flipToBack && innerCardElem.classList.contains("flip-it")) {
        innerCardElem.classList.remove("flip-it")
    }
}

function flipCards(flipToBack) {
    cards.forEach((card, index) => {
        setTimeout(() => {
            flipCard(card, flipToBack)
        }, index * cardFlipStaggerMs)
    })
}

function cardFlyInEffect() {
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.remove("fly-in")

            if (index === cards.length - 1) {
                playGameButtonElem.style.display = "inline-block"
            }
        }, 250 + index * 360)
    })
}

function clearShuffleStyles() {
    cards.forEach((card) => {
        card.style.transition = ""
        card.style.transform = ""
        card.style.zIndex = ""
    })
}

function animateShuffle(firstCardId, secondCardId) {
    const movingCards = [
        document.getElementById(firstCardId),
        document.getElementById(secondCardId)
    ]
    const previousRects = new Map(movingCards.map((card) => [card, card.getBoundingClientRect()]))

    swapCardPositions(firstCardId, secondCardId)
    transformGridArea(returnGridAreasMappedToCardPos())

    movingCards.forEach((card, index) => {
        const previousRect = previousRects.get(card)
        const nextRect = card.getBoundingClientRect()
        const deltaX = previousRect.left - nextRect.left
        const deltaY = previousRect.top - nextRect.top

        card.style.transition = "none"
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.04)`
        card.style.zIndex = String(100 + index)
    })

    movingCards.forEach((card) => card.getBoundingClientRect())

    requestAnimationFrame(() => {
        movingCards.forEach((card) => {
            card.style.transition = `transform ${shuffleAnimationMs}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
            card.style.transform = ""
        })
    })

    setTimeout(() => {
        movingCards.forEach((card) => {
            card.style.transition = ""
            card.style.zIndex = ""
        })
    }, shuffleAnimationMs + 40)
}

function getTwoDifferentCardIds() {
    const firstId = Math.floor(Math.random() * numCards) + 1
    let secondId = firstId

    while (secondId === firstId) {
        secondId = Math.floor(Math.random() * numCards) + 1
    }

    return [firstId, secondId]
}

function swapCardPositions(firstId, secondId) {
    const firstIndex = firstId - 1
    const secondIndex = secondId - 1
    const temp = cardPositions[firstIndex]

    cardPositions[firstIndex] = cardPositions[secondIndex]
    cardPositions[secondIndex] = temp
}

function dealCards() {
    addCardsToAppropriateCell()
    transformGridArea(returnGridAreasMappedToCardPos())
}

function resetCardPositions() {
    cardPositions = cardObjectDefinitions.map((cardItem) => cardItem.id)
    dealCards()
}

function returnGridAreasMappedToCardPos() {
    let firstPart = ""
    let secondPart = ""
    let areas = ""

    cards.forEach((card, index) => {
        areas += mapPositionToGridArea(cardPositions[index])

        if (index === 1) {
            firstPart = areas.trim()
            areas = ""
        } else if (index === 3) {
            secondPart = areas.trim()
        }
    })

    return `"${firstPart}" "${secondPart}"`
}

function mapPositionToGridArea(position) {
    const gridAreas = {
        1: "a ",
        2: "b ",
        3: "c ",
        4: "d "
    }

    return gridAreas[position]
}

function addCardsToAppropriateCell() {
    cards.forEach((card) => addCardToGridCell(card))
}

function createCards() {
    cardObjectDefinitions.forEach((cardItem) => createCard(cardItem))
}

function createCard(cardItem) {
    const cardElem = createElement("div")
    const cardInnerElem = createElement("div")
    const cardFrontElem = createElement("div")
    const cardBackElem = createElement("div")
    const cardFrontImg = createElement("img")
    const cardBackImg = createElement("img")

    addClassToElement(cardElem, "card")
    addClassToElement(cardElem, "fly-in")
    addIdToElement(cardElem, cardItem.id)
    cardElem.dataset.cardName = cardItem.name
    cardElem.setAttribute("role", "button")
    cardElem.setAttribute("aria-label", "Carte a choisir")

    addClassToElement(cardInnerElem, "card-inner")
    addClassToElement(cardFrontElem, "card-front")
    addClassToElement(cardBackElem, "card-back")

    addSrcToImageElem(cardBackImg, cardBackImgPath)
    addAltToImageElem(cardBackImg, "Dos de carte")
    addSrcToImageElem(cardFrontImg, cardItem.imagePath)
    addAltToImageElem(cardFrontImg, cardItem.name)

    addClassToElement(cardBackImg, "card-img")
    addClassToElement(cardFrontImg, "card-img")

    addChildElement(cardFrontElem, cardFrontImg)
    addChildElement(cardBackElem, cardBackImg)
    addChildElement(cardInnerElem, cardFrontElem)
    addChildElement(cardInnerElem, cardBackElem)
    addChildElement(cardElem, cardInnerElem)

    addCardToGridCell(cardElem)
    initializeCardPositions(cardElem)
    attachClickEventHandlerToCard(cardElem)
}

function attachClickEventHandlerToCard(card) {
    card.addEventListener("click", () => chooseCard(card))
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            chooseCard(card)
        }
    })
}

function initializeCardPositions(card) {
    cardPositions.push(Number(card.id))
}

function addCardToGridCell(card) {
    const cardPositionClassName = mapCardIdToGridCell(card)
    const cardPosElem = document.querySelector(cardPositionClassName)

    addChildElement(cardPosElem, card)
}

function mapCardIdToGridCell(card) {
    const gridCells = {
        1: ".card-pos-a",
        2: ".card-pos-b",
        3: ".card-pos-c",
        4: ".card-pos-d"
    }

    return gridCells[Number(card.id)]
}

function setTableState(state) {
    const states = ["previewing", "shuffling", "choosable", "revealed"]

    states.forEach((stateName) => cardContainerElem.classList.remove(`is-${stateName}`))

    if (state) {
        cardContainerElem.classList.add(`is-${state}`)
    }
}

function setCardsInteractive(interactive) {
    cards.forEach((card) => {
        card.tabIndex = interactive ? 0 : -1
        card.setAttribute("aria-disabled", String(!interactive))
    })
}

function clearCardFeedback() {
    cards.forEach((card) => {
        card.classList.remove("selected-card", "correct-card", "wrong-card")
    })
}

function markSelectedCard(card, hit) {
    card.classList.add("selected-card")
    card.classList.add(hit ? "correct-card" : "wrong-card")
}

function highlightAceCard() {
    cards.forEach((card) => {
        if (Number(card.id) === aceId) {
            card.classList.add("correct-card")
        }
    })
}

function createElement(elemType) {
    return document.createElement(elemType)
}

function addClassToElement(elem, className) {
    elem.classList.add(className)
}

function addIdToElement(elem, id) {
    elem.id = id
}

function addSrcToImageElem(imgElem, src) {
    imgElem.src = src
    imgElem.draggable = false
}

function addAltToImageElem(imgElem, alt) {
    imgElem.alt = alt
}

function addChildElement(parentElem, childElem) {
    parentElem.appendChild(childElem)
}

function getSerializedObjectAsJSON(obj) {
    return JSON.stringify(obj)
}

function getObjectFromJSON(json) {
    return JSON.parse(json)
}

function updateLocalStorageItem(key, value) {
    localStorage.setItem(key, value)
}

function removeLocalStorageItem(key) {
    localStorage.removeItem(key)
}

function getLocalStorageItemValue(key) {
    return localStorage.getItem(key)
}

function updateGameObject(currentScore, currentRound) {
    gameObj.score = currentScore
    gameObj.round = currentRound
}

function saveGameObjectToLocalStorage(currentScore, currentRound) {
    updateGameObject(currentScore, currentRound)
    updateLocalStorageItem(localStorageGameKey, getSerializedObjectAsJSON(gameObj))
}
