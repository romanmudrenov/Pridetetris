```javascript
window.PrideCore = window.PrideCore || {};

window.PrideCore.TetrisConfig = {
  COLS: 12,
  ROWS: 20,
  SERVICES: [
    { name: "Прямая (I)",     color: "#00f0ff", type: "billboard", shape: [[1,1,1,1]] },
    { name: "Т-фигура (T)",   color: "#b829ff", type: "design",    shape: [[0,1,0],[1,1,1]] },
    { name: "Зигзаг (Z)",     color: "#ff007a", type: "merch",     shape: [[1,1,0],[0,1,1]] },
    { name: "Змейка (S)",     color: "#00ff9d", type: "merch",     shape: [[0,1,1],[1,1,0]] },
    { name: "Квадрат (O)",    color: "#fcee09", type: "posm",      shape: [[1,1],[1,1]] },
    { name: "Г-фигура (L)",   color: "#ff8800", type: "print",     shape: [[1,0,0],[1,1,1]] },
    { name: "Обратная Г (J)", color: "#ff2a2a", type: "deadline",  shape: [[0,0,1],[1,1,1]] }
  ]
};
```
