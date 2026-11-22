const searchButton = document.getElementById("searchButton");
const playerNameInput = document.getElementById("playerNameInput");
const results = document.getElementById("results");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");

const rankNames = [
    "Нет ранга",
    "Herald",
    "Guardian",
    "Crusader",
    "Archon",
    "Legend",
    "Ancient",
    "Divine",
    "Immortal"
];

const heroes = {};

fetch("https://api.opendota.com/api/heroes")
    .then(function (response) {
        return response.json()
    })
    .then(function (data) {
        for (const hero of data) {
            heroes[hero.id] = {
                name: hero.localized_name,
                icon: "https://api.opendota.com" + hero.icon
            }
        }
    })
    .catch(function (err) {
        console.log("Не удалось загрузить героев", err)
    })

searchButton.onclick = function () {
    const name = playerNameInput.value.trim()

    if (name === "") {
        error.textContent = "Введите имя игрока"
        return
    }

    error.textContent = ""
    results.replaceChildren()
    loading.style.display = "block"
    searchButton.disabled = true

    const url = "https://api.opendota.com/api/search?q=" + encodeURIComponent(name) + "&limit=10"

    fetch(url)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Ошибка сервера");
            }
            return response.json()
        })
        .then(function (data) {
            loading.style.display = "none"
            searchButton.disabled = false

            if (!Array.isArray(data)) {
                error.textContent = "Ошибка"
                return
            }

            if (data.length === 0) {
                const empty = document.createElement("p")
                empty.textContent = "Ничего не найдено"
                results.appendChild(empty)
                return
            }

            for (let i = 0; i < data.length; i++) {
                const player = data[i]

                const card = document.createElement("div")
                card.className = "player"
                card.style.cursor = "pointer"

                const playerId = player.account_id

                card.onclick = function () {
                    openModal(playerId)
                }

                const img = document.createElement("img")
                img.src = player.avatarfull
                img.onerror = function () {
                    this.src = "https://via.placeholder.com/50"
                }

                const info = document.createElement("div")

                const nick = document.createElement("h3")
                nick.textContent = player.personaname || "Скрытый игрок"

                const id = document.createElement("p")
                id.textContent = "ID: " + player.account_id

                info.appendChild(nick)
                info.appendChild(id)
                card.appendChild(img)
                card.appendChild(info)
                results.appendChild(card)
            }
        })
        .catch(function (err) {
            loading.style.display = "none"
            searchButton.disabled = false
            error.textContent = "Ошибка при поиске"
            console.log(err)
        })
}

playerNameInput.onkeydown = function (event) {
    if (event.key === "Enter") {
        searchButton.click()
    }
};

function openModal(playerId) {
    modal.style.display = "flex"

    modalContent.replaceChildren()
    const loadingText = document.createElement("p")
    loadingText.textContent = "Загрузка..."
    modalContent.appendChild(loadingText)

    Promise.all([
        fetch("https://api.opendota.com/api/players/" + playerId).then(function (r) {
            return r.json()
        }),
        fetch("https://api.opendota.com/api/players/" + playerId + "/recentMatches").then(function (r) {
            return r.json()
        }),
        fetch("https://api.opendota.com/api/players/" + playerId + "/wl").then(function (r) {
            return r.json()
        })
    ])
        .then(function (responses) {
            const profile = responses[0]
            const matches = responses[1]
            const wl = responses[2]
            showPlayerInfo(profile, matches, wl)
        })
        .catch(function (err) {
            console.log(err)
            modalContent.replaceChildren()
            const errText = document.createElement("p")
            errText.textContent = "Не удалось загрузить данные игрока"
            modalContent.appendChild(errText)
        })
}

function showPlayerInfo(profile, matches, wl) {
    let nick = "Игрок"
    if (profile.profile && profile.profile.personaname) {
        nick = profile.profile.personaname
    }

    modalContent.replaceChildren()

    const title = document.createElement("h2")
    title.textContent = nick
    modalContent.appendChild(title)

    if (wl && (wl.win > 0 || wl.lose > 0)) {
        const wins = wl.win || 0
        const loses = wl.lose || 0
        const total = wins + loses
        const winRate = total > 0 ? (wins / total) * 100 : 0
        const isBad = winRate < 50
        const color = isBad ? "#f44336" : "#4caf50"

        const winrateBox = document.createElement("div")
        winrateBox.className = "winrate-info"

        const chartDiv = document.createElement("div")
        chartDiv.className = "winrate-chart"
        chartDiv.id = "winrate-chart-" + Date.now()

        winrateBox.appendChild(chartDiv)

        const sub = document.createElement("div")
        sub.className = "winrate-sub"
        sub.textContent = "Побед: " + wins + " • Поражений: " + loses + " • Всего: " + total

        winrateBox.appendChild(sub)
        modalContent.appendChild(winrateBox)

        renderWinrateChart(chartDiv.id, winRate, color)
    }

    const rankBox = document.createElement("div")
    rankBox.className = "rank-info"

    const rankTier = profile.rank_tier

    if (rankTier) {
        const rankNumber = Math.floor(rankTier / 10)
        const stars = rankTier % 10
        const rankName = rankNames[rankNumber] || "Неизвестный ранг"

        const iconUrl = rankName + ".png"

        const rankImg = document.createElement("img")
        rankImg.src = iconUrl
        rankImg.alt = "Ранг"
        rankImg.onerror = function () {
            this.style.display = "none"
        }
        rankBox.appendChild(rankImg)

        const rankTextWrap = document.createElement("div")
        const rankLabel = document.createElement("strong")
        rankLabel.textContent = "Ранг: "
        rankTextWrap.appendChild(rankLabel)
        rankTextWrap.appendChild(
            document.createTextNode(rankName + " (" + stars + "★)")
        )
        rankBox.appendChild(rankTextWrap)
    } else {
        const noRank = document.createElement("div")
        noRank.textContent = "Ранг: не откалиброван"
        rankBox.appendChild(noRank)
    }

    modalContent.appendChild(rankBox)

    const matchesTitle = document.createElement("h3")
    matchesTitle.textContent = "Последние матчи"
    modalContent.appendChild(matchesTitle)

    const matchList = document.createElement("div")
    matchList.className = "match-list"

    if (matches && matches.length > 0) {
        const lastMatches = matches.slice(0, 10)

        for (let i = 0; i < lastMatches.length; i++) {
            const match = lastMatches[i]

            let heroName = "Герой #" + match.hero_id
            let heroIcon = ""
            if (heroes[match.hero_id]) {
                heroName = heroes[match.hero_id].name
                heroIcon = heroes[match.hero_id].icon
            }

            let win = false
            if (match.player_slot < 128) {
                win = match.radiant_win
            } else {
                win = !match.radiant_win
            }

            let resultClass = "loss"
            let resultText = "Поражение"
            if (win) {
                resultClass = "win"
                resultText = "Победа"
            }

            const item = document.createElement("details")
            item.className = "match-item " + resultClass

            const summary = document.createElement("summary")

            const heroSpan = document.createElement("span")
            heroSpan.className = "hero-name"

            if (heroIcon !== "") {
                const heroImg = document.createElement("img")
                heroImg.src = heroIcon
                heroImg.alt = heroName
                heroImg.onerror = function () {
                    this.style.display = "none"
                }
                heroSpan.appendChild(heroImg)
            }

            const heroText = document.createElement("span")
            heroText.textContent = heroName
            heroSpan.appendChild(heroText)

            const kdaSpan = document.createElement("span")
            kdaSpan.className = "kda"
            kdaSpan.textContent = match.kills + "/" + match.deaths + "/" + match.assists

            const resultSpan = document.createElement("span")
            resultSpan.className = "result " + resultClass
            resultSpan.textContent = resultText

            summary.appendChild(heroSpan)
            summary.appendChild(kdaSpan)
            summary.appendChild(resultSpan)

            const detailsContent = document.createElement("div")
            detailsContent.className = "match-details"
            detailsContent.dataset.loaded = "false"

            const matchId = match.match_id
            const playerSlot = match.player_slot

            item.appendChild(summary)
            item.appendChild(detailsContent)

            item.addEventListener("toggle", function () {
                if (item.open && detailsContent.dataset.loaded === "false") {
                    detailsContent.dataset.loaded = "true"
                    loadMatchDetails(matchId, detailsContent, playerSlot)
                }
            })

            matchList.appendChild(item)
        }
    } else {
        const noMatches = document.createElement("p")
        noMatches.textContent = "Матчей не найдено"
        matchList.appendChild(noMatches)
    }

    modalContent.appendChild(matchList)
}

function loadMatchDetails(matchId, container, playerSlot) {
    fetch("https://api.opendota.com/api/matches/" + matchId)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Ошибка сервера");
            }
            return response.json()
        })
        .then(function (data) {
            container.replaceChildren()

            let playerData = null
            for (let i = 0; i < data.players.length; i++) {
                if (data.players[i].player_slot === playerSlot) {
                    playerData = data.players[i]
                    break
                }
            }

            if (!playerData) {
                const err = document.createElement("p")
                err.textContent = "Не удалось найти данные игрока в матче"
                container.appendChild(err)
                return
            }

            const rows = [
                { label: "Длительность", value: formatDuration(data.duration) },
                { label: "GPM", value: playerData.gold_per_min },
                { label: "XPM", value: playerData.xp_per_min },
                { label: "Урон по героям", value: playerData.hero_damage },
                { label: "Урон по строениям", value: playerData.tower_damage },
                { label: "Лечение союзников", value: playerData.hero_healing },
                { label: "Last hits / Denies", value: playerData.last_hits + " / " + playerData.denies },
                { label: "Нетворс", value: playerData.net_worth },
                { label: "Уровень", value: playerData.level }
            ]

            for (let i = 0; i < rows.length; i++) {
                const row = document.createElement("div")
                row.className = "match-details-row"

                const label = document.createElement("span")
                label.textContent = rows[i].label

                const value = document.createElement("span")
                value.textContent = rows[i].value != null ? rows[i].value : "—"

                row.appendChild(label)
                row.appendChild(value)
                container.appendChild(row)
            }

            const itemsWrap = document.createElement("div")
            itemsWrap.className = "match-items-list"

            const itemSlots = [
                "item_0", "item_1", "item_2", "item_3", "item_4", "item_5"
            ]

            for (let i = 0; i < itemSlots.length; i++) {
                const itemId = playerData[itemSlots[i]]
                if (!itemId) {
                    continue
                }

                const itemImg = document.createElement("img")
                itemImg.src = "https://api.opendota.com/apps/dota2/images/items/" + getItemNameById(itemId) + "_lg.png"
                itemImg.alt = "item"
                itemImg.onerror = function () {
                    this.style.display = "none"
                }
                itemsWrap.appendChild(itemImg)
            }

            if (itemsWrap.children.length > 0) {
                container.appendChild(itemsWrap)
            }
        })
        .catch(function (err) {
            console.log(err)
            container.replaceChildren()
            const errText = document.createElement("p")
            errText.textContent = "Не удалось загрузить детали матча"
            container.appendChild(errText)
        })
}

function formatDuration(seconds) {
    if (seconds == null) {
        return "—"
    }
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m + ":" + (s < 10 ? "0" : "") + s
}

function getItemNameById(itemId) {
    if (itemId === 0 || itemId == null) {
        return "empty"
    }
    return "item_" + itemId
}

function renderWinrateChart(containerId, winRate, color) {
    var root = am5.Root.new(containerId);

    root.setThemes([
        am5themes_Animated.new(root)
    ]);

    var chart = root.container.children.push(am5radar.RadarChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        innerRadius: am5.percent(30),
        startAngle: -90,
        endAngle: 270,
        radius: am5.percent(90)
    }));

    var xRenderer = am5radar.AxisRendererCircular.new(root, {
        minGridDistance: 30,
        visible: false
    });

    var xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, {
        max: 100,
        min: 0,
        strictMinMax: true,
        renderer: xRenderer
    }));

    var yRenderer = am5radar.AxisRendererRadial.new(root, {
        visible: false
    });

    var yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, {
        categoryField: "category",
        renderer: yRenderer
    }));

    yAxis.data.setAll([
        { category: "Winrate" }
    ]);

    var bgSeries = chart.series.push(am5radar.RadarColumnSeries.new(root, {
        name: "Background",
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: "full",
        categoryYField: "category",
        columnWidth: 1
    }));

    bgSeries.columns.template.setAll({
        fill: am5.color(0x3a3a3a),
        strokeOpacity: 0,
        cornerRadius: 5
    });

    bgSeries.data.setAll([
        { category: "Winrate", full: 100 }
    ]);

    var fgSeries = chart.series.push(am5radar.RadarColumnSeries.new(root, {
        name: "Winrate",
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: "value",
        categoryYField: "category",
        columnWidth: 1
    }));

    fgSeries.columns.template.setAll({
        fill: am5.color(color),
        strokeOpacity: 0,
        cornerRadius: 5,
        tooltipText: "{value}%"
    });

    fgSeries.data.setAll([
        { category: "Winrate", value: winRate }
    ]);

    chart.plotContainer.children.push(am5.Label.new(root, {
        text: winRate.toFixed(2) + "%",
        fontSize: 28,
        fontWeight: "bold",
        fill: am5.color(color),
        centerX: am5.percent(50),
        centerY: am5.percent(50),
        x: am5.percent(50),
        y: am5.percent(50)
    }));

    chart.appear(1000, 100);

    return root;
}

modalClose.onclick = function () {
    modal.style.display = "none"
    modalContent.replaceChildren()
}

modal.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = "none"
        modalContent.replaceChildren()
    }
}

document.onkeydown = function (event) {
    if (event.key === "Escape" && modal.style.display === "flex") {
        modal.style.display = "none"
        modalContent.replaceChildren()
    }
}

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem("users") || "{}")
    } catch (e) {
        return {}
    }
}

function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users))
}

function getCurrentUser() {
    return localStorage.getItem("currentUser") || ""
}

function setCurrentUser(name) {
    if (name) {
        localStorage.setItem("currentUser", name)
    } else {
        localStorage.removeItem("currentUser")
    }
}

const singInButton = document.createElement('button')
singInButton.classList.add('singInButton')
document.body.append(singInButton)
singInButton.textContent = "Sing in"

const logInButton = document.createElement('button')
logInButton.classList.add('logInButton')
document.body.append(logInButton)
logInButton.textContent = "Log in"

const signInModal = document.createElement("div")
signInModal.className = "modal-overlay"
signInModal.id = "signInModal"
signInModal.style.display = "none"

const signInWindow = document.createElement("div")
signInWindow.className = "modal-window auth-window"

const signInClose = document.createElement("span")
signInClose.className = "modal-close"
signInClose.textContent = "×"
signInClose.id = "signInClose"

const signInTitle = document.createElement("h2")
signInTitle.textContent = "Регистрация"

const signInText1 = document.createElement("p")
signInText1.textContent = "Введите ник"
signInText1.classList.add("singInText")

const signInName = document.createElement("input")
signInName.classList.add("singInInput")
signInName.type = "text"
signInName.placeholder = "Ник"

const signInText2 = document.createElement("p")
signInText2.textContent = "Введите пароль"
signInText2.classList.add("singInText")

const signInPassword = document.createElement("input")
signInPassword.classList.add("singInInput")
signInPassword.type = "password"
signInPassword.placeholder = "Пароль"

const signInSubmit = document.createElement("button")
signInSubmit.textContent = "Зарегистрироваться"
signInSubmit.classList.add("auth-button")

const signInMessage = document.createElement("p")
signInMessage.classList.add("auth-message")

signInWindow.appendChild(signInClose)
signInWindow.appendChild(signInTitle)
signInWindow.appendChild(signInText1)
signInWindow.appendChild(signInName)
signInWindow.appendChild(signInText2)
signInWindow.appendChild(signInPassword)
signInWindow.appendChild(signInSubmit)
signInWindow.appendChild(signInMessage)
signInModal.appendChild(signInWindow)
document.body.appendChild(signInModal)

signInClose.onclick = function () {
    signInModal.style.display = "none"
}

signInModal.onclick = function (event) {
    if (event.target === signInModal) {
        signInModal.style.display = "none"
    }
}

signInSubmit.onclick = function () {
    const name = signInName.value.trim()
    const pass = signInPassword.value

    if (name === "" || pass === "") {
        signInMessage.textContent = "Заполните все поля"
        return
    }

    const users = getUsers()

    if (users[name] !== undefined) {
        signInMessage.textContent = "Такой пользователь уже существует"
        return
    }

    users[name] = pass
    saveUsers(users)
    setCurrentUser(name)

    signInMessage.textContent = "Регистрация успешна"
    setTimeout(function () {
        signInModal.style.display = "none"
        updateAuthButtons()
    }, 700)
}

signInPassword.onkeydown = function (event) {
    if (event.key === "Enter") {
        signInSubmit.click()
    }
}

const logInModal = document.createElement("div")
logInModal.className = "modal-overlay"
logInModal.id = "logInModal"
logInModal.style.display = "none"

const logInWindow = document.createElement("div")
logInWindow.className = "modal-window auth-window"

const logInClose = document.createElement("span")
logInClose.className = "modal-close"
logInClose.textContent = "×"
logInClose.id = "logInClose"

const logInTitle = document.createElement("h2")
logInTitle.textContent = "Вход"

const logInText1 = document.createElement("p")
logInText1.textContent = "Введите ник"
logInText1.classList.add("singInText")

const logInName = document.createElement("input")
logInName.classList.add("singInInput")
logInName.type = "text"
logInName.placeholder = "Ник"

const logInText2 = document.createElement("p")
logInText2.textContent = "Введите пароль"
logInText2.classList.add("singInText")

const logInPassword = document.createElement("input")
logInPassword.classList.add("singInInput")
logInPassword.type = "password"
logInPassword.placeholder = "Пароль"

const logInSubmit = document.createElement("button")
logInSubmit.textContent = "Войти"
logInSubmit.classList.add("auth-button")

const logInMessage = document.createElement("p")
logInMessage.classList.add("auth-message")

logInWindow.appendChild(logInClose)
logInWindow.appendChild(logInTitle)
logInWindow.appendChild(logInText1)
logInWindow.appendChild(logInName)
logInWindow.appendChild(logInText2)
logInWindow.appendChild(logInPassword)
logInWindow.appendChild(logInSubmit)
logInWindow.appendChild(logInMessage)
logInModal.appendChild(logInWindow)
document.body.appendChild(logInModal)

logInClose.onclick = function () {
    logInModal.style.display = "none"
}

logInModal.onclick = function (event) {
    if (event.target === logInModal) {
        logInModal.style.display = "none"
    }
}

logInSubmit.onclick = function () {
    const name = logInName.value.trim()
    const pass = logInPassword.value

    if (name === "" || pass === "") {
        logInMessage.textContent = "Заполните все поля"
        return
    }

    const users = getUsers()

    if (users[name] === undefined) {
        logInMessage.textContent = "Пользователь не найден"
        return
    }

    if (users[name] !== pass) {
        logInMessage.textContent = "Неверный пароль"
        return
    }

    setCurrentUser(name)
    logInMessage.textContent = "Вход выполнен"
    setTimeout(function () {
        logInModal.style.display = "none"
        updateAuthButtons()
    }, 700)
}

logInPassword.onkeydown = function (event) {
    if (event.key === "Enter") {
        logInSubmit.click()
    }
}

function updateAuthButtons() {
    const user = getCurrentUser()

    if (user) {
        singInButton.textContent = user
        singInButton.style.width = "auto"
        singInButton.style.minWidth = "90px"
        singInButton.style.padding = "0 12px"
        singInButton.onclick = function () {}

        logInButton.textContent = "Log out"
        logInButton.onclick = function () {
            setCurrentUser(null)
            updateAuthButtons()
        }

        logInButton.style.right = (15 + singInButton.offsetWidth + 10) + "px"
    } else {
        singInButton.textContent = "Sign in"
        singInButton.style.width = "90px"
        singInButton.style.minWidth = ""
        singInButton.style.padding = ""
        singInButton.onclick = function () {
            signInName.value = ""
            signInPassword.value = ""
            signInMessage.textContent = ""
            signInModal.style.display = "flex"
        }

        logInButton.textContent = "Log in"
        logInButton.style.right = "115px"
        logInButton.onclick = function () {
            logInName.value = ""
            logInPassword.value = ""
            logInMessage.textContent = ""
            logInModal.style.display = "flex"
        }
    }
}

updateAuthButtons()

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        if (signInModal.style.display === "flex") {
            signInModal.style.display = "none"
        }
        if (logInModal.style.display === "flex") {
            logInModal.style.display = "none"
        }
    }
})
