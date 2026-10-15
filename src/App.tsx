import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import {
  Trophy,
  Users,
  Dice5,
  Coins,
  Sparkles,
  Bot,
  Play,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  ShieldAlert,
  Crown,
  ThumbsUp,
  ThumbsDown,
  EyeOff,
  Award,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

// ==========================================
// 1. ตั้งค่า FIREBASE (สำหรับซิงค์ข้อมูลแยกเครื่อง)
// ==========================================
// หมายเหตุ: หากนำไปรันบนเว็บของตัวเอง (เช่น Vercel/Netlify) ให้นำ Firebase Config ของคุณมาใส่แทนที่ตรงนี้ครับ
const firebaseConfig = {
  apiKey: "AIzaSyBczy-puVqP48snMERayJ05Qrf_Iu2lbI",
  authDomain: "foke-30afe.firebaseapp.com",
  projectId: "foke-30afe",
  storageBucket: "foke-30afe.appspot.com",
  messagingSenderId: "732495947881",
  appId: "1:732495947881:web:fd6d3a5645b9d087131af8",
  measurementId: "G-2NMZMT42JR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'camel-up-2nd-ed';

// ==========================================
// 2. ข้อมูลอูฐและค่าคงที่ตามกติกา 2nd Edition
// ==========================================
const RACING_CAMELS = [
  {
    id: 'purple',
    name: 'ม่วง',
    bg: 'bg-purple-600',
    border: 'border-purple-800',
    text: 'text-white',
    lightBg: 'bg-purple-100',
    lightText: 'text-purple-900',
    hex: '#9333ea',
  },
  {
    id: 'blue',
    name: 'น้ำเงิน',
    bg: 'bg-blue-500',
    border: 'border-blue-700',
    text: 'text-white',
    lightBg: 'bg-blue-100',
    lightText: 'text-blue-900',
    hex: '#3b82f6',
  },
  {
    id: 'green',
    name: 'เขียว',
    bg: 'bg-emerald-500',
    border: 'border-emerald-700',
    text: 'text-white',
    lightBg: 'bg-emerald-100',
    lightText: 'text-emerald-900',
    hex: '#10b981',
  },
  {
    id: 'yellow',
    name: 'เหลือง',
    bg: 'bg-amber-400',
    border: 'border-amber-600',
    text: 'text-amber-950',
    lightBg: 'bg-amber-100',
    lightText: 'text-amber-900',
    hex: '#fbbf24',
  },
  {
    id: 'red',
    name: 'แดง',
    bg: 'bg-rose-500',
    border: 'border-rose-700',
    text: 'text-white',
    lightBg: 'bg-rose-100',
    lightText: 'text-rose-900',
    hex: '#f43f5e',
  },
];

const CRAZY_CAMELS = [
  {
    id: 'black',
    name: 'อูฐบ้าดำ',
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    text: 'text-white',
    isCrazy: true,
    hex: '#18181b',
  },
  {
    id: 'white',
    name: 'อูฐบ้าขาว',
    bg: 'bg-stone-100',
    border: 'border-stone-400',
    text: 'text-stone-900',
    isCrazy: true,
    hex: '#f5f5f4',
  },
];

const ALL_CAMELS = [...RACING_CAMELS, ...CRAZY_CAMELS];
const RACING_IDS = RACING_CAMELS.map((c) => c.id);
const CRAZY_IDS = CRAZY_CAMELS.map((c) => c.id);

const getCamelMeta = (id) =>
  ALL_CAMELS.find((c) => c.id === id) || ALL_CAMELS[0];

// ฟังก์ชันสร้างตารางสนามแข่ง 16 ช่อง (ดัชนี 1 ถึง 17 โดยช่อง 17 คือเส้นชัย)
const createEmptyBoard = () => {
  const b = {};
  for (let i = 1; i <= 17; i++) b[i] = [];
  return b;
};

// คำนวณอันดับอูฐแข่งปกติ 5 สี (เรียงจากที่ 1 ไปที่ 5)
const getRacingRankings = (board) => {
  const ordered = [];
  for (let space = 17; space >= 1; space--) {
    const stack = board[space] || [];
    // ตัวที่อยู่บนสุด (ท้าย Array) มีอันดับสูงกว่าตัวข้างล่าง
    for (let i = stack.length - 1; i >= 0; i--) {
      if (RACING_IDS.includes(stack[i])) {
        ordered.push({ camel: stack[i], space, stackIndex: i });
      }
    }
  }
  return ordered;
};

// หาตำแหน่งของอูฐบนกระดาน
const findCamelPos = (board, camelId) => {
  for (let s = 1; s <= 17; s++) {
    const idx = (board[s] || []).indexOf(camelId);
    if (idx !== -1) return { space: s, index: idx };
  }
  return null;
};

// ==========================================
// 3. กฎการเลือกอูฐบ้า (Crazy Camel Priority Rule 2nd Ed.)
// ==========================================
const resolveCrazyCamelToMove = (board) => {
  const blackPos = findCamelPos(board, 'black');
  const whitePos = findCamelPos(board, 'white');
  if (!blackPos || !whitePos) return Math.random() < 0.5 ? 'black' : 'white';

  const blackStack = board[blackPos.space] || [];
  const whiteStack = board[whitePos.space] || [];

  const blackCarryingRacing = blackStack
    .slice(blackPos.index + 1)
    .some((id) => RACING_IDS.includes(id));
  const whiteCarryingRacing = whiteStack
    .slice(whitePos.index + 1)
    .some((id) => RACING_IDS.includes(id));

  // กฎข้อ 1: ถ้าอูฐบ้าตัวเดียวที่มีอูฐแข่งขี่หลังอยู่ ให้ตัวนั้นต้องเดิน!
  if (blackCarryingRacing && !whiteCarryingRacing) return 'black';
  if (whiteCarryingRacing && !blackCarryingRacing) return 'white';

  // กฎข้อ 2: ถ้าอูฐบ้าขี่คอกันเอง ตัวที่อยู่ข้างบนต้องเดิน!
  if (blackPos.space === whitePos.space) {
    return blackPos.index > whitePos.index ? 'black' : 'white';
  }

  // นอกเหนือจากนั้น สุ่ม 50/50 จากหน้าลูกเต๋าสีเทา
  return Math.random() < 0.5 ? 'black' : 'white';
};

// ==========================================
// 4. ฟังก์ชันขยับอูฐ (Stacking, เหยียบป้าย, ข้ามเส้นชัย)
// ==========================================
const executeCamelMove = (
  boardData,
  spectatorsData,
  playersData,
  camelId,
  steps
) => {
  const board = {};
  for (let i = 1; i <= 17; i++) board[i] = [...(boardData[i] || [])];
  const spectators = { ...spectatorsData };
  const players = playersData.map((p) => ({ ...p }));

  const pos = findCamelPos(board, camelId);
  if (!pos) return { board, players, logs: [], gameOver: false };

  const currentStack = board[pos.space];
  // ยกอูฐตัวที่เดิน พร้อมอูฐทุกตัวที่ขี่อยู่ข้างบนไปด้วยกัน
  const movingUnit = currentStack.slice(pos.index);
  board[pos.space] = currentStack.slice(0, pos.index);

  const isCrazy = CRAZY_IDS.includes(camelId);
  const direction = isCrazy ? -1 : 1;
  let targetSpace = pos.space + direction * steps;
  if (targetSpace < 1) targetSpace = 1;

  const logs = [];
  const meta = getCamelMeta(camelId);
  logs.push(
    `🎲 ${meta.name} เดิน ${isCrazy ? 'ถอยหลัง ' : ''}${steps} ช่อง (จากช่อง ${
      pos.space
    } ➔ ${Math.min(17, targetSpace)})`
  );

  // เช็กว่าข้ามเส้นชัยหรือยัง (อูฐปกติเดินไปช่อง >= 17)
  if (!isCrazy && targetSpace >= 17) {
    board[17] = [...board[17], ...movingUnit];
    logs.push(
      `🏁 ${meta.name} วิ่งทะลุเส้นชัยช่องที่ 16 แล้ว! จบการแข่งขันทันที!`
    );
    return { board, players, logs, gameOver: true };
  }

  // เช็กว่าเหยียบป้ายคนดู (Spectator Tile) หรือไม่
  const spec = spectators[targetSpace];
  if (spec) {
    const ownerIdx = players.findIndex((p) => p.id === spec.ownerId);
    if (ownerIdx !== -1) {
      players[ownerIdx].money += 1;
      logs.push(
        `💰 เหยียบป้ายของ ${players[ownerIdx].name}! (${players[ownerIdx].name} ได้รับ +1 EG£ ทันที)`
      );
    }

    if (spec.type === 'cheer') {
      // ป้ายเชียร์ (+1 ช่อง ตามทิศทางที่อูฐตัวนั้นเดิน และวางทับข้างบนสุด)
      const modSpace = Math.max(1, Math.min(17, targetSpace + direction));
      logs.push(
        `🌴 ป้ายกองเชียร์ทำงาน! ส่งกลุ่มของ ${meta.name} พุ่งต่อไปช่อง ${
          modSpace === 17 ? 'เส้นชัย' : modSpace
        } (ขึ้นบนสุด)`
      );
      board[modSpace] = [...board[modSpace], ...movingUnit];
      if (!isCrazy && modSpace >= 17) {
        logs.push(`🏁 ${meta.name} พุ่งเข้าเส้นชัยจากแรงเชียร์!`);
        return { board, players, logs, gameOver: true };
      }
    } else {
      // ป้ายโห่ (-1 ช่อง ย้อนทิศทางที่เดิน และมุดลงไปอยู่ใต้สุดของกองอูฐ!)
      const modSpace = Math.max(1, Math.min(16, targetSpace - direction));
      logs.push(
        `🌵 ป้ายโห่ฮาทำงาน! ดีดกลุ่มของ ${meta.name} ถอยไปช่อง ${modSpace} และมุดลงไปอยู่ใต้สุด!`
      );
      board[modSpace] = [...movingUnit, ...board[modSpace]];
    }
  } else {
    // การเดินปกติ: วางทับด้านบนสุดของช่องปลายทาง
    board[targetSpace] = [...board[targetSpace], ...movingUnit];
  }

  return { board, players, logs, gameOver: false };
};

// ==========================================
// 5. ฟังก์ชันคำนวณเงินรางวัลประจำรอบ & จบเกม
// ==========================================
const calculateLegScoring = (board, playersData) => {
  const rankings = getRacingRankings(board);
  const firstCamel = rankings[0]?.camel;
  const secondCamel = rankings[1]?.camel;

  const summary = [];
  const updatedPlayers = playersData.map((p) => {
    let earned = 0;
    const details = [];

    // 1. เงินจากตั๋วพีระมิด (ได้ไปแล้วตอนกดทอย แต่แสดงสรุปให้เห็น)
    if (p.pyramidCount > 0) {
      details.push(
        `ตั๋วพีระมิด ${p.pyramidCount} ใบ (รับไปแล้ว +${p.pyramidCount} EG£)`
      );
    }

    // 2. คิดเงินตั๋วทายผลประจำรอบ (Leg Bet Tickets)
    (p.legTickets || []).forEach((t) => {
      const cName = getCamelMeta(t.camel).name;
      if (t.camel === firstCamel) {
        earned += t.value;
        details.push(`ตั๋วอูฐ${cName}เข้าที่ 1 (+${t.value} EG£)`);
      } else if (t.camel === secondCamel) {
        earned += 1;
        details.push(`ตั๋วอูฐ${cName}เข้าที่ 2 (+1 EG£)`);
      } else {
        earned -= 1;
        details.push(`ตั๋วอูฐ${cName}หลุดโพเดียม (-1 EG£)`);
      }
    });

    const newMoney = Math.max(0, p.money + earned);
    summary.push({
      playerId: p.id,
      playerName: p.name,
      delta: earned,
      newMoney,
      details,
    });

    return {
      ...p,
      money: newMoney,
      legTickets: [],
      pyramidCount: 0,
    };
  });

  return { updatedPlayers, summary, firstCamel, secondCamel };
};

const calculateOverallScoring = (board, playersData, winnerBets, loserBets) => {
  const rankings = getRacingRankings(board);
  const championCamel = rankings[0]?.camel;
  const loserCamel = rankings[rankings.length - 1]?.camel;

  const REWARDS = [8, 5, 3, 2, 1];
  const playersMap = {};
  playersData.forEach((p) => {
    playersMap[p.id] = { ...p, overallDetails: [] };
  });

  // ตรวจกองทายแชมป์ (Overall Winner)
  let winRewardIdx = 0;
  const resolvedWinnerBets = (winnerBets || []).map((bet) => {
    const p = playersMap[bet.playerId];
    const cName = getCamelMeta(bet.camel).name;
    if (bet.camel === championCamel) {
      const reward = REWARDS[winRewardIdx] || 1;
      winRewardIdx++;
      if (p) {
        p.money += reward;
        p.overallDetails.push(`🏆 ทายแชมป์อูฐ${cName}ถูก! (+${reward} EG£)`);
      }
      return { ...bet, correct: true, reward };
    } else {
      if (p) {
        p.money = Math.max(0, p.money - 1);
        p.overallDetails.push(`❌ ทายแชมป์อูฐ${cName}ผิด (-1 EG£)`);
      }
      return { ...bet, correct: false, reward: -1 };
    }
  });

  // ตรวจกองทายบ๊วย (Overall Loser)
  let loseRewardIdx = 0;
  const resolvedLoserBets = (loserBets || []).map((bet) => {
    const p = playersMap[bet.playerId];
    const cName = getCamelMeta(bet.camel).name;
    if (bet.camel === loserCamel) {
      const reward = REWARDS[loseRewardIdx] || 1;
      loseRewardIdx++;
      if (p) {
        p.money += reward;
        p.overallDetails.push(`🐌 ทายบ๊วยอูฐ${cName}ถูก! (+${reward} EG£)`);
      }
      return { ...bet, correct: true, reward };
    } else {
      if (p) {
        p.money = Math.max(0, p.money - 1);
        p.overallDetails.push(`❌ ทายบ๊วยอูฐ${cName}ผิด (-1 EG£)`);
      }
      return { ...bet, correct: false, reward: -1 };
    }
  });

  return {
    finalPlayers: Object.values(playersMap),
    resolvedWinnerBets,
    resolvedLoserBets,
    championCamel,
    loserCamel,
  };
};

// ==========================================
// 6. คอมโพเนนต์หลัก (MAIN COMPONENT)
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // State สำหรับ UI เลือกวางป้ายและลงไพ่ลับ
  const [selectedSpaceForTile, setSelectedSpaceForTile] = useState(null);
  const [selectedCardForOverall, setSelectedCardForOverall] = useState(null);

  // 1) ล็อกอินเข้าใช้งานแบบนิรนาม (เพื่อให้แต่ละเครื่องมี ID ของตัวเอง)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Auth error:', err);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 2) ซิงค์ข้อมูลห้องแบบ Real-time จาก Firestore
  useEffect(() => {
    if (!user || !roomId) return;
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      roomId
    );
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          setGameState(snap.data());
        } else {
          setErrorMsg('ไม่พบห้องนี้ในระบบ');
          setRoomId(null);
        }
      },
      (err) => console.error('Sync error:', err)
    );
    return () => unsub();
  }, [user, roomId]);

  // 3) ระบบบอท AI เล่นอัตโนมัติเมื่อถึงตาบอท (เฉพาะเครื่อง Host เป็นคนประมวลผล)
  useEffect(() => {
    if (!gameState || !user || gameState.hostId !== user.uid) return;
    if (gameState.status !== 'playing') return;

    const activePlayer = gameState.players[gameState.currentTurn];
    if (!activePlayer || !activePlayer.isBot) return;

    const timer = setTimeout(() => {
      runBotTurn(activePlayer);
    }, 1400);

    return () => clearTimeout(timer);
  }, [gameState, user]);

  // ==========================================
  // การจัดการห้อง (สร้างห้อง / เข้าห้อง / เพิ่มบอท)
  // ==========================================
  const createRoom = async () => {
    const name = playerName.trim() || 'นักพนันทะเลทราย';
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const currentUserId = user?.uid || 'guest-' + Math.random().toString(36).substring(2, 6);
    
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      code
    );

    const initialData = {
      roomId: code,
      hostId: currentUserId,
      status: 'lobby', // lobby | playing | leg_end | finished
      legNumber: 1,
      currentTurn: 0,
      players: [
        {
          id: currentUserId,
          name,
          isBot: false,
          money: 3,
          legTickets: [],
          pyramidCount: 0,
          remainingCards: [...RACING_IDS],
        },
      ],
      board: createEmptyBoard(),
      pyramidRemaining: [...RACING_IDS, 'crazy'],
      rolledDice: [],
      legBetStacks: {
        purple: [5, 3, 2, 2],
        blue: [5, 3, 2, 2],
        green: [5, 3, 2, 2],
        yellow: [5, 3, 2, 2],
        red: [5, 3, 2, 2],
      },
      spectators: {},
      overallWinnerBets: [],
      overallLoserBets: [],
      logs: [`🎉 สร้างห้อง ${code} สำเร็จ! รอเพื่อนเข้าห้อง...`],
      lastLegSummary: null,
      overallSummary: null,
    };

    await setDoc(roomRef, initialData);
    setRoomId(code);
    setErrorMsg('');
  };

  const joinRoom = async () => {
    if (!user) return;
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length !== 4) {
      setErrorMsg('กรุณากรอกรหัสห้อง 4 ตัวอักษร');
      return;
    }
    const name =
      playerName.trim() || `นักพนัน ${Math.floor(Math.random() * 99)}`;
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      code
    );
    const snap = await getDoc(roomRef);

    if (!snap.exists()) {
      setErrorMsg('ไม่พบรหัสห้องนี้ กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    const data = snap.data();
    const exists = data.players.some((p) => p.id === user.uid);
    if (!exists) {
      if (data.status !== 'lobby') {
        setErrorMsg('ห้องนี้เริ่มเกมไปแล้ว ไม่สามารถเข้าร่วมกลางคันได้');
        return;
      }
      if (data.players.length >= 8) {
        setErrorMsg('ห้องเต็มแล้ว (สูงสุด 8 คน)');
        return;
      }
      const updatedPlayers = [
        ...data.players,
        {
          id: user.uid,
          name,
          isBot: false,
          money: 3,
          legTickets: [],
          pyramidCount: 0,
          remainingCards: [...RACING_IDS],
        },
      ];
      await updateDoc(roomRef, {
        players: updatedPlayers,
        logs: [...(data.logs || []), `👋 ${name} เข้าร่วมห้อง!`],
      });
    }
    setRoomId(code);
    setErrorMsg('');
  };

  const addBotPlayer = async () => {
    if (!gameState || gameState.players.length >= 8) return;
    const botNames = [
      'บอทอาบัง',
      'บอทคลีโอพัตรา',
      'บอทฟาโรห์',
      'บอทชีค',
      'บอทสฟิงซ์',
    ];
    const botId = 'bot_' + Math.random().toString(36).substring(2, 7);
    const botName =
      botNames[gameState.players.length % botNames.length] +
      ` #${gameState.players.length}`;

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      roomId
    );
    await updateDoc(roomRef, {
      players: [
        ...gameState.players,
        {
          id: botId,
          name: botName,
          isBot: true,
          money: 3,
          legTickets: [],
          pyramidCount: 0,
          remainingCards: [...RACING_IDS],
        },
      ],
      logs: [...gameState.logs, `🤖 เพิ่ม ${botName} เข้าสู่ห้อง`],
    });
  };

  // ==========================================
  // เริ่มเกมใหม่ (ทอยเต๋าวางจุดเริ่มต้นอูฐ 7 ตัว)
  // ==========================================
  const startGame = async () => {
    if (!gameState) return;
    const board = createEmptyBoard();
    const setupLogs = ['🐪 เริ่มการแข่งขัน Camel Up 2nd Edition!'];

    // สุ่มวางอูฐแข่ง 5 สีที่ช่อง 1, 2, 3
    const shuffledRacing = [...RACING_IDS].sort(() => Math.random() - 0.5);
    shuffledRacing.forEach((cid) => {
      const roll = Math.floor(Math.random() * 3) + 1;
      board[roll].push(cid);
    });
    setupLogs.push(
      '🎲 ทอยเต๋าจัดจุดเริ่มต้นอูฐแข่งทั้ง 5 สีที่ช่อง 1-3 เรียบร้อย'
    );

    // สุ่มวางอูฐบ้า 2 สีที่ช่อง 16, 15, 14 (17 - roll)
    CRAZY_IDS.forEach((cid) => {
      const roll = Math.floor(Math.random() * 3) + 1;
      const startSpace = 17 - roll; // 16, 15, หรือ 14
      board[startSpace].push(cid);
    });
    setupLogs.push('🤪 ทอยเต๋าวางอูฐบ้าสีดำและสีขาวที่ช่อง 14-16 เรียบร้อย');

    const resetPlayers = gameState.players.map((p) => ({
      ...p,
      money: 3,
      legTickets: [],
      pyramidCount: 0,
      remainingCards: [...RACING_IDS],
    }));

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      roomId
    );
    await updateDoc(roomRef, {
      status: 'playing',
      legNumber: 1,
      currentTurn: 0,
      board,
      players: resetPlayers,
      pyramidRemaining: [...RACING_IDS, 'crazy'],
      rolledDice: [],
      legBetStacks: {
        purple: [5, 3, 2, 2],
        blue: [5, 3, 2, 2],
        green: [5, 3, 2, 2],
        yellow: [5, 3, 2, 2],
        red: [5, 3, 2, 2],
      },
      spectators: {},
      overallWinnerBets: [],
      overallLoserBets: [],
      logs: setupLogs,
      lastLegSummary: null,
      overallSummary: null,
    });
  };

  // ==========================================
  // 4 แอคชันหลักของผู้เล่นในแต่ละตา
  // ==========================================

  // แอคชันที่ 1: กดเขย่าพีระมิดทอยลูกเต๋า (+1 EG£ ทันที)
  const handleRollPyramid = async (actorId = user?.uid) => {
    if (!gameState || gameState.status !== 'playing') return;
    const activePlayer = gameState.players[gameState.currentTurn];
    if (!activePlayer || activePlayer.id !== actorId) return;

    const remaining = [...gameState.pyramidRemaining];
    if (remaining.length <= 1) return;

    // สุ่มหยิบลูกเต๋า 1 ลูกออกจากพีระมิด
    const pickIdx = Math.floor(Math.random() * remaining.length);
    const dieType = remaining.splice(pickIdx, 1)[0];
    const steps = Math.floor(Math.random() * 3) + 1;

    let movingCamel = dieType;
    if (dieType === 'crazy') {
      movingCamel = resolveCrazyCamelToMove(gameState.board);
    }

    // ผู้เล่นที่กดทอยได้รับเงิน 1 EG£ ทันที + เก็บตั๋วพีระมิด
    const updatedPlayersPre = gameState.players.map((p) =>
      p.id === actorId
        ? { ...p, money: p.money + 1, pyramidCount: (p.pyramidCount || 0) + 1 }
        : p
    );

    const moveRes = executeCamelMove(
      gameState.board,
      gameState.spectators,
      updatedPlayersPre,
      movingCamel,
      steps
    );

    const newRolledDice = [
      ...gameState.rolledDice,
      { dieType, camel: movingCamel, steps, rollerName: activePlayer.name },
    ];
    const newLogs = [
      ...gameState.logs,
      `🔺 ${activePlayer.name} เขย่าพีระมิด (+1 EG£)`,
      ...moveRes.logs,
    ].slice(-25);

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      roomId
    );

    // กรณีอูฐเข้าเส้นชัย ➔ จบเกมทันที! (คิดเงินรอบสุดท้าย + คิดเงินแชมป์/บ๊วย)
    if (moveRes.gameOver) {
      const legRes = calculateLegScoring(moveRes.board, moveRes.players);
      const overallRes = calculateOverallScoring(
        moveRes.board,
        legRes.updatedPlayers,
        gameState.overallWinnerBets,
        gameState.overallLoserBets
      );

      await updateDoc(roomRef, {
        status: 'finished',
        board: moveRes.board,
        players: overallRes.finalPlayers,
        pyramidRemaining: remaining,
        rolledDice: newRolledDice,
        lastLegSummary: legRes.summary,
        overallSummary: overallRes,
        logs: [...newLogs, '🏆 การแข่งขันสิ้นสุดลงแล้ว! สรุปผลรางวัลทั้งหมด!'],
      });
      return;
    }

    // กรณีทอยลูกเต๋าครบ 5 ลูกแล้ว (เหลือลูกเต๋าในพีระมิด 1 ลูก) ➔ จบรอบ (Leg End)!
    if (newRolledDice.length >= 5) {
      const legRes = calculateLegScoring(moveRes.board, moveRes.players);
      await updateDoc(roomRef, {
        status: 'leg_end',
        board: moveRes.board,
        players: legRes.updatedPlayers,
        pyramidRemaining: remaining,
        rolledDice: newRolledDice,
        lastLegSummary: legRes.summary,
        currentTurn: (gameState.currentTurn + 1) % gameState.players.length,
        logs: [
          ...newLogs,
          `🔔 ทอยเต๋าครบ 5 ลูกแล้ว! จบรอบที่ ${gameState.legNumber} และคำนวณเงินรางวัล!`,
        ],
      });
      return;
    }

    // ตาถัดไปตามปกติ
    await updateDoc(roomRef, {
      board: moveRes.board,
      players: moveRes.players,
      pyramidRemaining: remaining,
      rolledDice: newRolledDice,
      currentTurn: (gameState.currentTurn + 1) % gameState.players.length,
      logs: newLogs,
    });
  };

  // แอคชันที่ 2: หยิบตั๋วทายผลประจำรอบ (Leg Bet Ticket: 5, 3, 2, 2)
  const handleTakeLegTicket = async (camelId, actorId = user?.uid) => {
    if (!gameState || gameState.status !== 'playing') return;
    const activePlayer = gameState.players[gameState.currentTurn];
    if (!activePlayer || activePlayer.id !== actorId) return;

    const stack = [...(gameState.legBetStacks[camelId] || [])];
    if (stack.length === 0) return;

    const topValue = stack.shift();
    const updatedStacks = { ...gameState.legBetStacks, [camelId]: stack };

    const updatedPlayers = gameState.players.map((p) =>
      p.id === actorId
        ? {
            ...p,
            legTickets: [
              ...(p.legTickets || []),
              { camel: camelId, value: topValue },
            ],
          }
        : p
    );

    const cName = getCamelMeta(camelId).name;
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      roomId
    );
    await updateDoc(roomRef, {
      legBetStacks: updatedStacks,
      players: updatedPlayers,
      currentTurn: (gameState.currentTurn + 1) % gameState.players.length,
      logs: [
        ...gameState.logs,
        `🎟️ ${activePlayer.name} หยิบตั๋วทายผลอูฐ${cName} (มูลค่า ${topValue} EG£)`,
      ].slice(-25),
    });
  };

  // แอคชันที่ 3: วางหรือย้ายป้ายคนดู (Spectator Tile: Cheer +1 / Boo -1)
  const handlePlaceSpectator = async (space, type, actorId = user?.uid) => {
    if (!gameState || gameState.status !== 'playing') return;
    const activePlayer = gameState.players[gameState.currentTurn];
    if (!activePlayer || activePlayer.id !== actorId) return;

    // ตรวจสอบความถูกต้องของช่อง (ช่อง 2–16, ไม่มีอูฐยืน, ไม่มีป้ายคนอื่นวางชิดติดกัน)
    if (space < 2 || space > 16) return;
    if ((gameState.board[space] || []).length > 0) return;

    const newSpectators = { ...gameState.spectators };
    // ลบป้ายเดิมของผู้เล่นคนนี้ออกก่อน (ถ้าเคยมีวางไว้บนสนาม)
    Object.keys(newSpectators).forEach((sp) => {
      if (newSpectators[sp]?.ownerId === actorId) {
        delete newSpectators[sp];
      }
    });

    // เช็กว่าช่องที่จะวาง หรือช่องข้างเคียง มีป้ายคนอื่นอยู่หรือไม่
    if (
      newSpectators[space] ||
      newSpectators[space - 1] ||
      newSpectators[space + 1]
    ) {
      return;
    }

    newSpectators[space] = {
      ownerId: actorId,
      ownerName: activePlayer.name,
      type, // 'cheer' | 'boo'
    };

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      roomId
    );
    await updateDoc(roomRef, {
      spectators: newSpectators,
      currentTurn: (gameState.currentTurn + 1) % gameState.players.length,
      logs: [
        ...gameState.logs,
        `${type === 'cheer' ? '🌴' : '🌵'} ${activePlayer.name} วางป้าย${
          type === 'cheer' ? 'กองเชียร์ (+1)' : 'โห่ฮา (-1)'
        } ที่ช่อง ${space}`,
      ].slice(-25),
    });
    setSelectedSpaceForTile(null);
  };

  // แอคชันที่ 4: แอบลงไพ่ทายแชมป์ หรือ ทายบ๊วย ตอนจบเกม (Secret Overall Bet)
  const handlePlaceOverallBet = async (
    camelId,
    betType,
    actorId = user?.uid
  ) => {
    if (!gameState || gameState.status !== 'playing') return;
    const activePlayer = gameState.players[gameState.currentTurn];
    if (!activePlayer || activePlayer.id !== actorId) return;
    if (!(activePlayer.remainingCards || []).includes(camelId)) return;

    const updatedPlayers = gameState.players.map((p) =>
      p.id === actorId
        ? {
            ...p,
            remainingCards: p.remainingCards.filter((c) => c !== camelId),
          }
        : p
    );

    const betEntry = {
      playerId: actorId,
      playerName: activePlayer.name,
      camel: camelId,
    };

    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      roomId
    );
    await updateDoc(roomRef, {
      players: updatedPlayers,
      overallWinnerBets:
        betType === 'winner'
          ? [...gameState.overallWinnerBets, betEntry]
          : gameState.overallWinnerBets,
      overallLoserBets:
        betType === 'loser'
          ? [...gameState.overallLoserBets, betEntry]
          : gameState.overallLoserBets,
      currentTurn: (gameState.currentTurn + 1) % gameState.players.length,
      logs: [
        ...gameState.logs,
        `🃏 ${activePlayer.name} แอบคว่ำไพ่ทายผล "${
          betType === 'winner' ? 'แชมป์ชนะเลิศ 🏆' : 'บ๊วยอันดับสุดท้าย 🐌'
        }" ลงกองกลาง!`,
      ].slice(-25),
    });
    setSelectedCardForOverall(null);
  };

  // เริ่มรอบต่อไป (Next Leg) หลังจากดูสรุปผลจบรอบเสร็จ
  const handleStartNextLeg = async () => {
    if (!gameState) return;
    const roomRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'camel_rooms_2nd',
      roomId
    );
    await updateDoc(roomRef, {
      status: 'playing',
      legNumber: gameState.legNumber + 1,
      pyramidRemaining: [...RACING_IDS, 'crazy'],
      rolledDice: [],
      legBetStacks: {
        purple: [5, 3, 2, 2],
        blue: [5, 3, 2, 2],
        green: [5, 3, 2, 2],
        yellow: [5, 3, 2, 2],
        red: [5, 3, 2, 2],
      },
      spectators: {}, // เก็บป้ายคนดูทั้งหมดคืนเจ้าของตอนขึ้นรอบใหม่ตามกฎ
      lastLegSummary: null,
      logs: [
        ...gameState.logs,
        `🌅 เริ่มรอบการแข่งขันที่ ${
          gameState.legNumber + 1
        }! นำลูกเต๋าทั้ง 6 ลูกกลับเข้าพีระมิดแล้ว`,
      ].slice(-25),
    });
  };

  // ==========================================
  // AI BOT LOGIC (สำหรับทดสอบเล่นกับบอท)
  // ==========================================
  const runBotTurn = async (botPlayer) => {
    const rankings = getRacingRankings(gameState.board);
    const leadCamel = rankings[0]?.camel;
    const lastCamel = rankings[rankings.length - 1]?.camel;

    // โอกาสเลือกหยิบตั๋วผู้นำถ้ายังมีใบมูลค่า 5 หรือ 3 เหลืออยู่
    if (
      leadCamel &&
      (gameState.legBetStacks[leadCamel] || [])[0] >= 3 &&
      Math.random() < 0.45
    ) {
      await handleTakeLegTicket(leadCamel, botPlayer.id);
      return;
    }

    // โอกาสแอบวางไพ่ทายบ๊วยหรือแชมป์เมื่อเกมเดินไปไกลแล้ว
    if (
      rankings[0]?.space >= 9 &&
      (botPlayer.remainingCards || []).includes(leadCamel) &&
      Math.random() < 0.35
    ) {
      await handlePlaceOverallBet(leadCamel, 'winner', botPlayer.id);
      return;
    }
    if (
      rankings[0]?.space >= 9 &&
      (botPlayer.remainingCards || []).includes(lastCamel) &&
      Math.random() < 0.35
    ) {
      await handlePlaceOverallBet(lastCamel, 'loser', botPlayer.id);
      return;
    }

    // ค่าเริ่มต้น: กดทอยลูกเต๋าพีระมิดรับ 1 EG£
    await handleRollPyramid(botPlayer.id);
  };

  // ตรวจสอบว่าช่องนั้นสามารถวางป้ายคนดูได้หรือไม่
  const isSpaceValidForSpectator = (space) => {
    if (!gameState || !user) return false;
    if (space < 2 || space > 16) return false;
    if ((gameState.board[space] || []).length > 0) return false;

    const specs = { ...gameState.spectators };
    Object.keys(specs).forEach((sp) => {
      if (specs[sp]?.ownerId === user.uid) delete specs[sp];
    });
    if (specs[space] || specs[space - 1] || specs[space + 1]) return false;
    return true;
  };

  const copyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ==========================================
  // หน้าจอแรก: สร้างห้อง หรือ ใส่รหัสเข้าห้อง (แยกเครื่อง)
  // ==========================================
  if (!roomId || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 text-amber-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-amber-950/90 border-2 border-amber-500/40 rounded-3xl p-7 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold tracking-wider mb-2">
              BOARD GAME ONLINE • MULTI-DEVICE
            </span>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-400">
              CAMEL UP
            </h1>
            <p className="text-sm font-bold text-amber-400">
              2nd Edition • โหมดแยกเครื่องเล่นกับเพื่อน
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1.5">
                ชื่อของคุณในเกม
              </label>
              <input
                type="text"
                placeholder="เช่น อาบังสายซิ่ง..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-amber-900/60 border border-amber-600/50 text-white placeholder-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-200 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

<button
  onClick={createRoom}
  disabled={false}
  style={{ opacity: 1, pointerEvents: 'auto' }}
  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black text-base shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
>
              <Sparkles className="w-5 h-5" />
              สร้างห้องใหม่ (รับรหัส 4 หลัก)
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-amber-700/60"></div>
              <span className="flex-shrink mx-3 text-xs text-amber-400 font-semibold">
                หรือใส่รหัสห้องของเพื่อน
              </span>
              <div className="flex-grow border-t border-amber-700/60"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                placeholder="รหัส 4 ตัว"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                className="w-36 px-4 py-3 rounded-xl bg-amber-900/60 border border-amber-600/50 text-center text-xl font-black tracking-widest uppercase text-amber-200 placeholder-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={joinRoom}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                เข้าห้องเพื่อน
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-amber-800/60 text-xs text-amber-300/80 space-y-1">
            <p className="font-bold text-amber-200">
              💡 วิธีเล่นกับเพื่อนแบบแยกเครื่อง:
            </p>
            <p>
              1. ให้หัวหน้าห้องกด <b>"สร้างห้องใหม่"</b> แล้วส่งรหัส 4 ตัวใน
              Discord
            </p>
            <p>
              2. เพื่อนแต่ละคนเปิดหน้านี้จากมือถือหรือคอมตัวเอง
              พิมพ์ชื่อและใส่รหัส 4 ตัวเพื่อเข้าห้องเดียวกันได้เลย!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ข้อมูลของผู้เล่นเครื่องนี้ และผู้เล่นที่กำลังถึงตาเดิน
  const myPlayer =
    gameState.players.find((p) => p.id === user?.uid) || gameState.players[0];
  const activePlayer = gameState.players[gameState.currentTurn];
  const isMyTurn =
    gameState.status === 'playing' && activePlayer?.id === user?.uid;
  const rankings = getRacingRankings(gameState.board);

  // ==========================================
  // หน้าจอรอเพื่อนเข้าห้อง (LOBBY)
  // ==========================================
  if (gameState.status === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 text-amber-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-amber-950/90 border-2 border-amber-500/40 rounded-3xl p-7 shadow-2xl">
          <div className="flex items-center justify-between border-b border-amber-800 pb-4 mb-5">
            <div>
              <p className="text-xs text-amber-400 font-bold uppercase">
                รหัสห้องสำหรับส่งให้เพื่อนใน Discord
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-4xl font-black tracking-widest text-amber-300">
                  {roomId}
                </span>
                <button
                  onClick={copyRoomCode}
                  className="px-3 py-1.5 rounded-lg bg-amber-800/80 hover:bg-amber-700 text-xs font-bold flex items-center gap-1.5 border border-amber-600/50"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />{' '}
                      คัดลอกแล้ว
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> คัดลอกรหัส
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                ผู้เล่น {gameState.players.length} / 8 คน
              </span>
            </div>
          </div>

          <h2 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> รายชื่อผู้เล่นในห้องตอนนี้:
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
            {gameState.players.map((p, idx) => (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  p.id === user?.uid
                    ? 'bg-amber-500/20 border-amber-400'
                    : 'bg-amber-900/40 border-amber-700/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-amber-950 font-black text-xs flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-sm flex items-center gap-1.5">
                      {p.name}
                      {p.id === user?.uid && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-black">
                          คุณ
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-amber-400">
                      {p.isBot ? '🤖 บอท AI' : '📱 ผู้เล่นออนไลน์'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={addBotPlayer}
              disabled={gameState.players.length >= 8}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-amber-100 font-bold text-sm flex items-center justify-center gap-2 border border-amber-600/50"
            >
              <Bot className="w-4 h-4" /> + เพิ่มบอท AI
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-lg flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" /> เริ่มการแข่งขัน!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // หน้าจอกระดานเกมหลัก (PLAYING / LEG_END / FINISHED)
  // ==========================================
  return (
    <div className="min-h-screen bg-stone-950 text-amber-50 p-2 sm:p-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* แถบข้อมูลด้านบน (Top Header Bar) */}
        <header className="bg-amber-950/90 border border-amber-700/50 rounded-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center gap-2">
              <span className="text-xs text-amber-300 font-bold">ห้อง:</span>
              <span className="text-lg font-black tracking-wider text-amber-300">
                {roomId}
              </span>
              <button
                onClick={copyRoomCode}
                className="text-amber-300 hover:text-white"
                title="คัดลอกรหัสห้อง"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-black text-amber-300 flex items-center gap-2">
                🐪 CAMEL UP (2nd Ed.)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-amber-950 font-black">
                  รอบที่ (Leg) {gameState.legNumber}
                </span>
              </h1>
            </div>
          </div>

          {/* แถบแจ้งเตือนคิวผู้เล่นปัจจุบัน */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border ${
                isMyTurn
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 animate-pulse shadow-lg shadow-emerald-500/20'
                  : 'bg-amber-900/70 text-amber-200 border-amber-700'
              }`}
            >
              {isMyTurn ? (
                <>
                  <Sparkles className="w-4 h-4" /> ถึงตาของคุณแล้ว! เลือกทำ 1
                  แอคชัน
                </>
              ) : (
                <>
                  ⏳ กำลังรอตาของ:{' '}
                  <span className="text-amber-300 font-black">
                    {activePlayer?.name}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => setShowRules(!showRules)}
              className="p-2 rounded-xl bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-200"
              title="กติกา 2nd Edition"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* กล่องคู่มือกติกาฉบับย่อ (เปิด/ปิดได้) */}
        {showRules && (
          <div className="bg-amber-950 border-2 border-amber-500/50 rounded-2xl p-4 text-xs sm:text-sm space-y-2 shadow-xl">
            <div className="flex justify-between items-center border-b border-amber-800 pb-2">
              <h3 className="font-black text-amber-300 text-base">
                📜 สรุปกติกา Camel Up (2nd Edition)
              </h3>
              <button
                onClick={() => setShowRules(false)}
                className="text-amber-400 hover:text-white font-bold"
              >
                ✕ ปิด
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-amber-100/90">
              <div>
                <p className="font-bold text-amber-300 mb-1">
                  🐪 การเดินและขี่คอของอูฐ:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    อูฐที่เดินจะพาอูฐทุกตัวที่ <b>ขี่อยู่ข้างบน</b> ไปด้วยกัน
                    ส่วนตัวที่อยู่ข้างล่างจะไม่ขยับ
                  </li>
                  <li>
                    อูฐตัวที่อยู่ <b>บนสุด</b>{' '}
                    ของกองถือว่ามีอันดับนำตัวที่อยู่ข้างล่าง
                  </li>
                  <li>
                    <b>อูฐบ้า (ดำ/ขาว):</b> เดินย้อนศร!
                    หากมีอูฐแข่งขี่หลังอยู่เพียงตัวเดียว หรือขี่กันเอง
                    ระบบจะบังคับให้ตัวที่แบกภาระเดินทันที!
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-amber-300 mb-1">
                  🎯 ในตาของคุณ เลือกทำเพียง 1 แอคชัน:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <b>1. เขย่าพีระมิด:</b> รับเงินทันที <b>+1 EG£</b>{' '}
                    และสุ่มทอยเต๋า 1 ลูก (เมื่อครบ 5 ลูกจะจบรอบทันที!)
                  </li>
                  <li>
                    <b>2. หยิบตั๋วทายผลประจำรอบ:</b> แย่งหยิบใบบนสุด (5, 3, 2, 2
                    EG£) ถ้าอูฐเข้าที่ 1 ได้ตามตั๋ว, ที่ 2 ได้ +1 EG£, ที่ 3
                    ลงไปเสีย -1 EG£
                  </li>
                  <li>
                    <b>3. วางป้ายคนดู:</b> เลือกเชียร์ (🌴 +1 ช่อง ขึ้นบนสุด)
                    หรือโห่ (🌵 -1 ช่อง มุดลงล่างสุด) ใครเหยียบป้ายเรารับทันที
                    +1 EG£!
                  </li>
                  <li>
                    <b>4. แอบทายแชมป์/บ๊วยจบเกม:</b> คว่ำไพ่จากมือทายผลตอนจบเกม
                    ทายถูกคนแรกๆ ได้ <b>8, 5, 3, 2, 1 EG£</b> (ผิดเสีย -1 EG£)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* โครงสร้างหลัก: ซ้าย (สนามแข่ง 16 ช่อง + พีระมิด) / ขวา (แผงแอคชัน 4 อย่าง + ข้อมูลผู้เล่น) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* คอลัมน์ซ้าย (7 ส่วน): สนามแข่งทะเลทราย 16 ช่อง & พีระมิด */}
          <div className="lg:col-span-7 space-y-3">
            {/* แถบสรุปอันดับอูฐปัจจุบันแบบ Real-time */}
            <div className="bg-amber-950/70 border border-amber-800/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" /> อันดับอูฐปัจจุบัน
                (1 ➔ 5):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {rankings.map((r, idx) => {
                  const m = getCamelMeta(r.camel);
                  return (
                    <div
                      key={r.camel}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 border ${m.bg} ${m.text} ${m.border}`}
                    >
                      <span>#{idx + 1}</span>
                      <span>{m.name}</span>
                      <span className="opacity-75 text-[10px]">
                        (ช่อง {r.space === 17 ? 'เส้นชัย' : r.space})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* กระดานสนามแข่ง 16 ช่อง + ช่องเส้นชัย (17) */}
            <div className="bg-gradient-to-b from-amber-900/60 to-amber-950/90 border-2 border-amber-700/60 rounded-3xl p-3 sm:p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2 text-xs text-amber-300/90 font-semibold">
                <span>🏜️ สนามแข่งทะเลทราย (ช่อง 1 ➔ 16)</span>
                <span>
                  คลิกที่ช่องว่าง (2–16) เพื่อวางป้าย 🌴 เชียร์ (+1) หรือ 🌵 โห่
                  (-1)
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Array.from({ length: 17 }, (_, i) => i + 1).map((spaceNum) => {
                  const stack = gameState.board[spaceNum] || [];
                  const spec = gameState.spectators[spaceNum];
                  const isFinish = spaceNum === 17;
                  const canPlaceTile =
                    isMyTurn && !isFinish && isSpaceValidForSpectator(spaceNum);
                  const isSelected = selectedSpaceForTile === spaceNum;

                  return (
                    <div
                      key={spaceNum}
                      onClick={() => {
                        if (canPlaceTile) {
                          setSelectedSpaceForTile(isSelected ? null : spaceNum);
                        }
                      }}
                      className={`relative min-h-[120px] rounded-2xl p-2 flex flex-col justify-between border-2 transition ${
                        isFinish
                          ? 'bg-gradient-to-br from-emerald-950 to-teal-900 border-emerald-400 col-span-2 sm:col-span-2'
                          : isSelected
                          ? 'bg-amber-800/80 border-amber-300 ring-2 ring-amber-400 cursor-pointer'
                          : canPlaceTile
                          ? 'bg-amber-950/60 border-amber-700/60 hover:border-amber-400 cursor-pointer'
                          : 'bg-amber-950/40 border-amber-800/40'
                      }`}
                    >
                      {/* หัวช่องตัวเลข */}
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            isFinish
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-amber-900/90 text-amber-300'
                          }`}
                        >
                          {isFinish ? '🏁 เส้นชัย (17+)' : `ช่อง ${spaceNum}`}
                        </span>
                        {canPlaceTile && !spec && (
                          <span className="text-[10px] text-amber-400/70">
                            +วางป้าย
                          </span>
                        )}
                      </div>

                      {/* แสดงป้ายคนดู (ถ้ามี) */}
                      {spec && (
                        <div
                          className={`my-1 px-2 py-1 rounded-lg text-[10px] font-black border text-center shadow ${
                            spec.type === 'cheer'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                              : 'bg-rose-500/20 border-rose-400 text-rose-200'
                          }`}
                        >
                          <div>
                            {spec.type === 'cheer'
                              ? '🌴 เชียร์ (+1 บนสุด)'
                              : '🌵 โห่ (-1 ใต้สุด)'}
                          </div>
                          <div className="text-[9px] opacity-80 truncate">
                            ของ: {spec.ownerName}
                          </div>
                        </div>
                      )}

                      {/* เมนูกดยืนยันวางป้าย เชียร์ / โห่ เมื่อคลิกเลือกช่อง */}
                      {isSelected && canPlaceTile && (
                        <div
                          className="my-1 flex flex-col gap-1 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              handlePlaceSpectator(spaceNum, 'cheer')
                            }
                            className="w-full py-1 px-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center gap-1"
                          >
                            <ThumbsUp className="w-3 h-3" /> 🌴 เชียร์ (+1)
                          </button>
                          <button
                            onClick={() =>
                              handlePlaceSpectator(spaceNum, 'boo')
                            }
                            className="w-full py-1 px-1.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] flex items-center justify-center gap-1"
                          >
                            <ThumbsDown className="w-3 h-3" /> 🌵 โห่ (-1)
                          </button>
                        </div>
                      )}

                      {/* กองอูฐที่ขี่คอกันในช่องนี้ (แสดงเรียงจากล่างขึ้นบนด้วย flex-col-reverse) */}
                      <div className="flex flex-col-reverse gap-1 mt-auto pt-1">
                        {stack.map((cid, sIdx) => {
                          const cm = getCamelMeta(cid);
                          return (
                            <div
                              key={cid}
                              className={`px-2 py-1 rounded-lg border text-xs font-black flex items-center justify-between shadow-sm ${cm.bg} ${cm.text} ${cm.border}`}
                            >
                              <span className="flex items-center gap-1">
                                🐪 {cm.name}
                              </span>
                              <span className="text-[10px] opacity-85 flex items-center">
                                {cm.isCrazy ? (
                                  <ArrowLeft className="w-3 h-3" />
                                ) : (
                                  <ArrowRight className="w-3 h-3" />
                                )}
                                #{sIdx + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* โซนพีระมิดและลูกเต๋าที่ทอยออกมาแล้วในรอบนี้ */}
            <div className="bg-amber-950/80 border border-amber-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-amber-300">
                    🔺 พีระมิดลูกเต๋า (ทอยแล้ว {gameState.rolledDice.length} / 5
                    ลูก)
                  </span>
                </div>
                <p className="text-xs text-amber-300/80">
                  ในพีระมิดมีเต๋า 6 ลูก (อูฐแข่ง 5 + อูฐบ้าสีเทา 1) เมื่อทอยครบ
                  5 ลูกจะจบรอบทันที!
                </p>

                {/* รายการลูกเต๋าที่ถูกทอยออกมาแล้วในรอบนี้ */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {gameState.rolledDice.map((d, i) => {
                    const m = getCamelMeta(d.camel);
                    return (
                      <div
                        key={i}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow ${m.bg} ${m.text} ${m.border}`}
                      >
                        <Dice5 className="w-4 h-4" />
                        <span>
                          {m.name}: เดิน {d.steps}
                        </span>
                      </div>
                    );
                  })}
                  {Array.from({
                    length: Math.max(0, 5 - gameState.rolledDice.length),
                  }).map((_, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-xl border border-dashed border-amber-700 text-xs text-amber-500/70 font-bold"
                    >
                      รอทอยลูกที่ {gameState.rolledDice.length + idx + 1}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleRollPyramid()}
                disabled={!isMyTurn}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-black text-base shadow-xl transition transform active:scale-95 flex flex-col items-center justify-center shrink-0"
              >
                <span className="flex items-center gap-2">
                  <Dice5 className="w-5 h-5" /> เขย่าพีระมิดทอยเต๋า!
                </span>
                <span className="text-xs font-bold opacity-90">
                  (รับตั๋วพีระมิด +1 EG£ ทันที)
                </span>
              </button>
            </div>
          </div>

          {/* คอลัมน์ขวา (5 ส่วน): ตั๋วเดิมพันประจำรอบ + ไพ่ลับทายแชมป์/บ๊วย + ข้อมูลผู้เล่นทุกคน */}
          <div className="lg:col-span-5 space-y-3">
            {/* แอคชัน: แย่งหยิบตั๋วทายผลผู้ชนะประจำรอบ (Leg Bet Tickets: 5, 3, 2, 2) */}
            <div className="bg-amber-950/80 border border-amber-700/60 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  🎟️ ตั๋วทายที่ 1 ประจำรอบนี้ (Leg Betting Tickets)
                </h3>
                <span className="text-[11px] text-amber-400">
                  ที่ 1 ได้ตามตั๋ว | ที่ 2 ได้ +1 | อื่นๆ -1 EG£
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {RACING_CAMELS.map((c) => {
                  const stack = gameState.legBetStacks[c.id] || [];
                  const topVal = stack[0];
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleTakeLegTicket(c.id)}
                      disabled={!isMyTurn || stack.length === 0}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-between transition ${
                        stack.length === 0
                          ? 'bg-stone-900 border-stone-800 opacity-40 cursor-not-allowed'
                          : `${c.bg} ${c.text}${c.border} hover:scale-105 shadow-md`
                      }`}
                    >
                      <span className="text-xs font-black">อูฐ{c.name}</span>
                      <span className="text-2xl font-black my-1">
                        {stack.length > 0 ? `${topVal}£` : 'หมด'}
                      </span>
                      <span className="text-[10px] opacity-85 font-bold">
                        เหลือ {stack.length}/4 ใบ
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* แอคชันเฉพาะเครื่องของคุณ: ไพ่ในมือสำหรับแอบทายแชมป์ / บ๊วย ตอนจบเกม */}
            <div className="bg-amber-950/80 border-2 border-amber-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4 text-amber-400" /> ไพ่ลับในมือคุณ
                  (ทายแชมป์ / บ๊วย ตอนจบเกม)
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  เพื่อนมองไม่เห็นสีที่คุณลง
                </span>
              </div>

              <p className="text-xs text-amber-200/80">
                คลิกเลือกไพ่สีอูฐที่ต้องการ แล้วกดคว่ำลงกอง <b>แชมป์ชนะเลิศ</b>{' '}
                หรือ <b>บ๊วยอันดับสุดท้าย</b> (รางวัลตามลำดับคนทายถูก:{' '}
                <b>8, 5, 3, 2, 1 EG£</b> | ทายผิด <b>-1 EG£</b>)
              </p>

              {/* รายการไพ่ในมือที่ยังไม่ได้ใช้ของผู้เล่นเครื่องนี้ */}
              <div className="flex flex-wrap gap-2">
                {RACING_CAMELS.map((c) => {
                  const available = (myPlayer?.remainingCards || []).includes(
                    c.id
                  );
                  const isSelected = selectedCardForOverall === c.id;
                  return (
                    <button
                      key={c.id}
                      disabled={!isMyTurn || !available}
                      onClick={() =>
                        setSelectedCardForOverall(isSelected ? null : c.id)
                      }
                      className={`flex-1 min-w-[65px] py-2 px-2 rounded-xl border-2 text-xs font-black transition ${
                        !available
                          ? 'bg-stone-900 border-stone-800 text-stone-600 opacity-40 cursor-not-allowed'
                          : isSelected
                          ? `${c.bg}${c.text} border-white ring-2 ring-amber-300 scale-105`
                          : `${c.bg} ${c.text}${c.border} opacity-90 hover:opacity-100`
                      }`}
                    >
                      <div>🐪 {c.name}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">
                        {available ? 'พร้อมใช้' : 'ลงไปแล้ว'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ปุ่มยืนยันลงไพ่แชมป์ หรือ บ๊วย */}
              {selectedCardForOverall && isMyTurn && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() =>
                      handlePlaceOverallBet(selectedCardForOverall, 'winner')
                    }
                    className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <Crown className="w-4 h-4" /> คว่ำไพ่ทาย "แชมป์" 🏆
                  </button>
                  <button
                    onClick={() =>
                      handlePlaceOverallBet(selectedCardForOverall, 'loser')
                    }
                    className="py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <ThumbsDown className="w-4 h-4" /> คว่ำไพ่ทาย "บ๊วย" 🐌
                  </button>
                </div>
              )}

              {/* แสดงจำนวนไพ่ที่คว่ำอยู่ในกองกลางปัจจุบัน */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-800/60 text-xs">
                <div className="bg-amber-900/40 border border-amber-700/50 rounded-xl p-2.5">
                  <div className="font-bold text-emerald-300 flex items-center justify-between">
                    <span>🏆 กองทายแชมป์</span>
                    <span>{gameState.overallWinnerBets.length} ใบ</span>
                  </div>
                  <div className="text-[11px] text-amber-300/80 mt-1 truncate">
                    {gameState.overallWinnerBets.length === 0
                      ? 'ยังไม่มีคนลงไพ่'
                      : gameState.overallWinnerBets
                          .map((b, i) => `#${i + 1} ${b.playerName}`)
                          .join(', ')}
                  </div>
                </div>

                <div className="bg-amber-900/40 border border-amber-700/50 rounded-xl p-2.5">
                  <div className="font-bold text-rose-300 flex items-center justify-between">
                    <span>🐌 กองทายบ๊วย</span>
                    <span>{gameState.overallLoserBets.length} ใบ</span>
                  </div>
                  <div className="text-[11px] text-amber-300/80 mt-1 truncate">
                    {gameState.overallLoserBets.length === 0
                      ? 'ยังไม่มีคนลงไพ่'
                      : gameState.overallLoserBets
                          .map((b, i) => `#${i + 1} ${b.playerName}`)
                          .join(', ')}
                  </div>
                </div>
              </div>
            </div>

            {/* กระดานสถานะเงินและตั๋วของผู้เล่นทุกคนในห้อง */}
            <div className="bg-amber-950/80 border border-amber-700/60 rounded-2xl p-4 space-y-2.5">
              <h3 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                <Users className="w-4 h-4" /> สถานะผู้เล่นทุกคนในห้อง
              </h3>

              <div className="space-y-2">
                {gameState.players.map((p, idx) => {
                  const isTurn =
                    gameState.status === 'playing' &&
                    gameState.currentTurn === idx;
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                        isTurn
                          ? 'bg-amber-500/20 border-amber-400'
                          : 'bg-amber-900/30 border-amber-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-amber-100">
                            {p.name}
                          </span>
                          {p.id === user?.uid && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black">
                              คุณ
                            </span>
                          )}
                          {isTurn && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black">
                              กำลังเล่น
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-xs flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" /> {p.money} EG£
                          </span>
                        </div>
                      </div>

                      {/* แสดงตั๋วทายผลประจำรอบที่ผู้เล่นคนนี้ถืออยู่ */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-amber-400/80">ตั๋วรอบนี้:</span>
                        {(p.legTickets || []).length === 0 ? (
                          <span className="text-amber-500/50">ยังไม่มี</span>
                        ) : (
                          p.legTickets.map((t, tidx) => {
                            const cm = getCamelMeta(t.camel);
                            return (
                              <span
                                key={tidx}
                                className={`px-2 py-0.5 rounded font-black ${cm.bg} ${cm.text}`}
                              >
                                {cm.name} ({t.value}£)
                              </span>
                            );
                          })
                        )}
                        {p.pyramidCount > 0 && (
                          <span className="ml-auto text-amber-300 font-bold">
                            🔺 ทอยเต๋า {p.pyramidCount} ครั้ง
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* บันทึกเหตุการณ์สด (Game Logs) */}
            <div className="bg-stone-900/90 border border-amber-800/50 rounded-2xl p-3">
              <p className="text-xs font-bold text-amber-400 mb-1.5">
                📢 บันทึกการแข่งขันแบบสด (Live Log):
              </p>
              <div className="h-28 overflow-y-auto space-y-1 text-xs text-amber-100/90 pr-1">
                {[...(gameState.logs || [])].reverse().map((l, i) => (
                  <div
                    key={i}
                    className="py-0.5 border-b border-amber-900/40 last:border-0"
                  >
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          หน้าต่างป๊อปอัปสรุปคะแนนเมื่อจบรอบ (LEG SCORING MODAL)
         ========================================== */}
      {gameState.status === 'leg_end' && gameState.lastLegSummary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-amber-950 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black">
                ทอยลูกเต๋าครบ 5 ลูกแล้ว!
              </span>
              <h2 className="text-2xl font-black text-amber-300 mt-2">
                📊 สรุปรายได้จบรอบที่ {gameState.legNumber}
              </h2>
              <p className="text-xs text-amber-200/80 mt-1">
                อันดับ 1 ตอนนี้:{' '}
                <b>อูฐ{getCamelMeta(rankings[0]?.camel).name}</b> | อันดับ 2:{' '}
                <b>อูฐ{getCamelMeta(rankings[1]?.camel).name}</b>
              </p>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {gameState.lastLegSummary.map((s) => (
                <div
                  key={s.playerId}
                  className="p-3 rounded-2xl bg-amber-900/50 border border-amber-700/60 space-y-1"
                >
                  <div className="flex items-center justify-between font-black text-sm">
                    <span>{s.playerName}</span>
                    <span
                      className={
                        s.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {s.delta >= 0 ? `+${s.delta}` : s.delta} EG£ ➔ รวม{' '}
                      {s.newMoney} EG£
                    </span>
                  </div>
                  <div className="text-xs text-amber-200/80 space-y-0.5">
                    {s.details.length === 0 ? (
                      <p>• ไม่ได้ถือตั๋วทายผลในรอบนี้</p>
                    ) : (
                      s.details.map((d, idx) => <p key={idx}>• {d}</p>)
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleStartNextLeg}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> เริ่มรอบการแข่งขันถัดไป (Leg{' '}
              {gameState.legNumber + 1})
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          หน้าต่างป๊อปอัปสรุปผลตอนจบเกม (FINAL GAME OVER MODAL)
         ========================================== */}
      {gameState.status === 'finished' && gameState.overallSummary && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full bg-amber-950 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <Award className="w-12 h-12 text-amber-400 mx-auto" />
              <h2 className="text-3xl font-black text-amber-300">
                🏁 จบการแข่งขัน! สรุปผลผู้ชนะ
              </h2>
              <div className="flex flex-wrap justify-center gap-3 pt-2 text-xs font-black">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300">
                  🏆 แชมป์ชนะเลิศ: อูฐ
                  {getCamelMeta(gameState.overallSummary.championCamel).name}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-300">
                  🐌 บ๊วยอันดับสุดท้าย: อูฐ
                  {getCamelMeta(gameState.overallSummary.loserCamel).name}
                </span>
              </div>
            </div>

            {/* ตารางอันดับผู้เล่นตามจำนวนเงินสูงสุด */}
            <div className="space-y-2">
              {[...gameState.players]
                .sort((a, b) => b.money - a.money)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex flex-col gap-1 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border-amber-300'
                        : 'bg-amber-900/40 border-amber-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg font-black text-amber-300">
                          #{idx + 1}
                        </span>
                        <span className="font-black text-base">{p.name}</span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-xs">
                            👑 เศรษฐีอันดับ 1
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-black text-amber-300">
                        {p.money} EG£
                      </span>
                    </div>

                    {(p.overallDetails || []).length > 0 && (
                      <div className="text-xs text-amber-200/90 pt-1 border-t border-amber-800/50">
                        {p.overallDetails.map((d, i) => (
                          <div key={i}>• {d}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> เล่นใหม่อีกรอบในห้องเดิม!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
