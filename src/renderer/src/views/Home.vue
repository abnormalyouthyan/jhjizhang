<template>
  <div class="app-container">
    <div class="header">
      <h1>记账系统</h1>
      <div class="header-buttons">
        <button @click="showSmartInput = true" class="smart-recognize-btn">智能识别</button>
        <button @click="showHistoryModal = true" class="history-btn">下注记录</button>
      </div>
    </div>
    
    <!-- 智能识别弹窗 -->
    <div v-if="showSmartInput" class="modal-overlay">
      <div class="modal-content">
        <h3>智能识别下注</h3>
        <textarea 
          v-model="smartInputText" 
          placeholder="例如: 10,20,30-30 表示10/20/30各下注30元"
          rows="5"
        ></textarea>
        <div class="modal-buttons">
          <button @click="parseSmartInput" class="parse-btn">解析</button>
          <button @click="showSmartInput = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>

    <!-- 历史记录弹窗 -->
    <div v-if="showHistoryModal" class="modal-overlay">
      <div class="modal-content history-modal">
        <div class="modal-header">
          <h3>下注记录</h3>
          <button @click="exportToExcel" class="export-btn">导出Excel</button>
          <button @click="showHistoryModal = false" class="close-btn">&times;</button>
        </div>
        <div class="history-list">
          <div v-if="bettingHistory.length === 0" class="empty-history">暂无下注记录</div>
          <div 
            v-for="(record, index) in bettingHistory" 
            :key="`record-${index}`" 
            class="history-item"
          >
            <div class="history-header">
              <span class="history-time">{{ formatTime(record.timestamp) }}</span>
              <span class="history-total">总金额: {{ safeToFixed(record.total) }}</span>
              <button @click="openDeleteConfirm(index)" class="delete-btn">删除</button>
            </div>
            <div class="history-details">
              <div 
                v-for="num in getValidBets(record.bets)" 
                :key="`detail-${num}`"
                class="bet-detail"
                :style="{ backgroundColor: getZodiacColor(num, 0.1) }"
              >
                {{ num }} ({{ getZodiac(num) }}): {{ safeToFixed(record.bets[num]) }}
              </div>
              <div 
                v-for="zodiac in getValidZodiacBets(record.zodiacBets)"
                :key="`zodiac-${zodiac}`"
                class="bet-detail"
                :style="{ backgroundColor: getZodiacColorByZodiac(zodiac, 0.1) }"
              >
                {{ zodiac }}: {{ safeToFixed(record.zodiacBets[zodiac]) }}
              </div>
              <div 
                v-if="record.colorBets && record.colorBets.red > 0"
                class="bet-detail red-wave"
              >
                红波: {{ safeToFixed(record.colorBets.red) }}
              </div>
              <div 
                v-if="record.colorBets && record.colorBets.blue > 0"
                class="bet-detail blue-wave"
              >
                蓝波: {{ safeToFixed(record.colorBets.blue) }}
              </div>
              <div 
                v-if="record.colorBets && record.colorBets.green > 0"
                class="bet-detail green-wave"
              >
                绿波: {{ safeToFixed(record.colorBets.green) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认删除弹窗 -->
    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-content confirm-modal">
        <h3>确认删除</h3>
        <p>确定要删除这条下注记录吗？</p>
        <div class="modal-buttons">
          <button @click="deleteRecord" class="confirm-btn">确认</button>
          <button @click="showConfirmModal = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>

    <div class="betting-container">
      <div class="left-panel">
        <h2>下注区域</h2>
        <div class="number-grid">
          <div 
            class="number-item" 
            v-for="number in numbers" 
            :key="`bet-${number}`"
            :style="{ backgroundColor: getZodiacColor(number, 0.2) }"
          >
            <div class="number-label">{{ number }} ({{ getZodiac(number) }})</div>
            <input
              type="number"
              min="0"
              v-model.number="currentBets[number]"
              placeholder="金额"
              @keydown.enter="submitBets"
              ref="inputFields"
            />
          </div>
        </div>
        
        <h3>生肖下注</h3>
        <div class="zodiac-bet-container">
          <div 
            class="zodiac-bet-item" 
            v-for="zodiac in zodiacList" 
            :key="`zodiac-${zodiac}`"
            :style="{ 
              backgroundColor: getZodiacColorByZodiac(zodiac, 0.1),
              borderColor: getZodiacColorByZodiac(zodiac, 1)
            }"
          >
            <div class="zodiac-label">{{ zodiac }}</div>
            <input
              type="number"
              min="0"
              v-model.number="currentZodiacBets[zodiac]"
              placeholder="金额"
              @keydown.enter="submitBets"
            />
          </div>
        </div>
        
        <h3>波色下注</h3>
        <div class="color-bet-container">
          <div class="color-bet-item red-wave">
            <div class="color-label">红波</div>
            <input
              type="number"
              min="0"
              v-model.number="currentColorBets.red"
              placeholder="金额"
              @keydown.enter="submitBets"
            />
          </div>
          <div class="color-bet-item blue-wave">
            <div class="color-label">蓝波</div>
            <input
              type="number"
              min="0"
              v-model.number="currentColorBets.blue"
              placeholder="金额"
              @keydown.enter="submitBets"
            />
          </div>
          <div class="color-bet-item green-wave">
            <div class="color-label">绿波</div>
            <input
              type="number"
              min="0"
              v-model.number="currentColorBets.green"
              placeholder="金额"
              @keydown.enter="submitBets"
            />
          </div>
        </div>
        
        <button @click="submitBets">提交下注</button>
      </div>

      <div class="right-panel">
        <h2>下注结果</h2>
        <div class="result-grid">
          <div
            class="result-item"
            v-for="number in numbers"
            :key="`result-${number}`"
            :style="{ 
              backgroundColor: getTotalBet(number) > 0 ? getZodiacColor(number, 0.4) : '',
              borderColor: getZodiacColor(number, 1)
            }"
          >
            <div class="result-number">{{ number }} ({{ getZodiac(number) }})</div>
            <div class="result-amount">{{ safeToFixed(getTotalBet(number)) }}</div>
          </div>
        </div>
        
        <h3>生肖下注结果</h3>
        <div class="zodiac-result-container">
          <div 
            class="zodiac-result-item"
            v-for="zodiac in zodiacList"
            :key="`zodiac-result-${zodiac}`"
            :style="{ 
              backgroundColor: totalZodiacBets[zodiac] > 0 ? getZodiacColorByZodiac(zodiac, 0.4) : '',
              borderColor: getZodiacColorByZodiac(zodiac, 1)
            }"
          >
            <div class="zodiac-label">{{ zodiac }}</div>
            <div class="result-amount">{{ safeToFixed(totalZodiacBets[zodiac]) }}</div>
          </div>
        </div>
        
        <h3>波色下注结果</h3>
        <div class="color-result-container">
          <div class="color-result-item red-wave">
            <div class="color-label">红波</div>
            <div class="result-amount">{{ safeToFixed(totalColorBets.red) }}</div>
          </div>
          <div class="color-result-item blue-wave">
            <div class="color-label">蓝波</div>
            <div class="result-amount">{{ safeToFixed(totalColorBets.blue) }}</div>
          </div>
          <div class="color-result-item green-wave">
            <div class="color-label">绿波</div>
            <div class="result-amount">{{ safeToFixed(totalColorBets.green) }}</div>
          </div>
        </div>
        
        <div class="total">总下注金额: {{ safeToFixed(totalAmount) }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import * as XLSX from 'xlsx';

export default {
  setup() {
    const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
    const inputFields = ref([]);
    const zodiacList = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

    // 生肖映射
    const zodiacMap = {
      1: '蛇', 2: '龙', 3: '兔', 4: '虎', 5: '牛', 6: '鼠', 7: '猪',
      8: '狗', 9: '鸡', 10: '猴', 11: '羊', 12: '马', 13: '蛇', 14: '龙',
      15: '兔', 16: '虎', 17: '牛', 18: '鼠', 19: '猪', 20: '狗', 21: '鸡',
      22: '猴', 23: '羊', 24: '马', 25: '蛇', 26: '龙', 27: '兔', 28: '虎',
      29: '牛', 30: '鼠', 31: '猪', 32: '狗', 33: '鸡', 34: '猴', 35: '羊',
      36: '马', 37: '蛇', 38: '龙', 39: '兔', 40: '虎', 41: '牛', 42: '鼠',
      43: '猪', 44: '狗', 45: '鸡', 46: '猴', 47: '羊', 48: '马', 49: '蛇'
    };

    // 波色分组
    const colorGroups = {
      red: ['蛇', '龙', '猪', '狗', '马'],
      blue: ['兔', '虎', '鸡', '猴'],
      green: ['牛', '鼠', '羊']
    };

    // 当前输入的下注金额
    const currentBets = ref({});
    // 当前生肖下注
    const currentZodiacBets = ref({});
    // 当前波色下注
    const currentColorBets = ref({
      red: 0,
      blue: 0,
      green: 0
    });
    // 总下注金额记录
    const totalBets = ref({});
    // 总生肖下注
    const totalZodiacBets = ref({});
    // 总波色下注
    const totalColorBets = ref({
      red: 0,
      blue: 0,
      green: 0
    });
    // 下注历史记录
    const bettingHistory = ref([]);
    // 弹窗状态
    const showSmartInput = ref(false);
    const showHistoryModal = ref(false);
    const showConfirmModal = ref(false);
    const smartInputText = ref('');
    const deleteIndex = ref(null);

    // 安全数值格式化
    const safeToFixed = (value, digits = 2) => {
      const num = Number(value);
      return isNaN(num) ? '0.00' : num.toFixed(digits);
    };

    // 获取有效的下注号码
    const getValidBets = (bets) => {
      return Object.keys(bets || {}).filter(n => bets[n] > 0);
    };

    // 获取有效的生肖下注
    const getValidZodiacBets = (zodiacBets) => {
      return Object.keys(zodiacBets || {}).filter(z => zodiacBets[z] > 0);
    };

    // 获取单个号码的总下注金额
    const getTotalBet = (number) => {
      return Number(totalBets.value[number]) || 0;
    };

    // 初始化数据
    const initializeData = () => {
      numbers.forEach(num => {
        currentBets.value[num] = 0;
        totalBets.value[num] = 0;
      });
      
      // 初始化生肖下注
      zodiacList.forEach(zodiac => {
        currentZodiacBets.value[zodiac] = 0;
        totalZodiacBets.value[zodiac] = 0;
      });
      
      // 初始化波色下注
      currentColorBets.value = { red: 0, blue: 0, green: 0 };
      totalColorBets.value = { red: 0, blue: 0, green: 0 };
      
      loadHistory();
    };

    // 从本地存储加载历史记录
    const loadHistory = () => {
      const savedHistory = localStorage.getItem('bettingHistory');
      if (savedHistory) {
        try {
          bettingHistory.value = JSON.parse(savedHistory) || [];
          recalculateTotalBets();
        } catch (e) {
          console.error("解析历史记录出错:", e);
          bettingHistory.value = [];
        }
      }
    };

    // 重新计算总下注金额
    const recalculateTotalBets = () => {
      // 重置数字下注
      numbers.forEach(num => {
        totalBets.value[num] = 0;
      });
      
      // 重置生肖下注
      zodiacList.forEach(zodiac => {
        totalZodiacBets.value[zodiac] = 0;
      });
      
      // 重置波色下注
      totalColorBets.value = { red: 0, blue: 0, green: 0 };
      
      bettingHistory.value.forEach(record => {
        if (record && record.bets) {
          // 计算数字下注
          numbers.forEach(num => {
            totalBets.value[num] += Number(record.bets[num]) || 0;
          });
          
          // 计算生肖下注
          if (record.zodiacBets) {
            zodiacList.forEach(zodiac => {
              totalZodiacBets.value[zodiac] += Number(record.zodiacBets[zodiac]) || 0;
            });
          }
          
          // 计算波色下注
          if (record.colorBets) {
            totalColorBets.value.red += Number(record.colorBets.red) || 0;
            totalColorBets.value.blue += Number(record.colorBets.blue) || 0;
            totalColorBets.value.green += Number(record.colorBets.green) || 0;
          }
        }
      });
    };

    // 保存历史记录到本地存储
    const saveHistory = () => {
      localStorage.setItem('bettingHistory', JSON.stringify(bettingHistory.value));
    };

    // 计算总下注金额
    const totalAmount = computed(() => {
      const numberTotal = numbers.reduce((sum, num) => sum + getTotalBet(num), 0);
      const zodiacTotal = zodiacList.reduce((sum, zodiac) => sum + (totalZodiacBets.value[zodiac] || 0), 0);
      const colorTotal = Object.values(totalColorBets.value).reduce((sum, val) => sum + val, 0);
      return numberTotal + zodiacTotal + colorTotal;
    });

    // 获取数字对应的生肖
    const getZodiac = (number) => {
      return zodiacMap[number] || '';
    };

    // 获取数字对应的颜色
    const getZodiacColor = (number, opacity = 1) => {
      const zodiac = getZodiac(number);
      return getZodiacColorByZodiac(zodiac, opacity);
    };

    // 根据生肖获取颜色
    const getZodiacColorByZodiac = (zodiac, opacity = 1) => {
      if (colorGroups.red.includes(zodiac)) {
        return `rgba(255, 0, 0, ${opacity})`;
      } else if (colorGroups.blue.includes(zodiac)) {
        return `rgba(0, 0, 255, ${opacity})`;
      } else if (colorGroups.green.includes(zodiac)) {
        return `rgba(0, 255, 0, ${opacity})`;
      }
      return '';
    };

    // 格式化时间显示
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    };

    // 提交下注
    const submitBets = () => {
      let currentTotal = 0;
      const bets = {};
      const zodiacBets = {};
      
      // 计算数字下注
      numbers.forEach(num => {
        const amount = Number(currentBets.value[num]) || 0;
        bets[num] = amount;
        currentTotal += amount;
        currentBets.value[num] = 0;
      });
      
      // 计算生肖下注
      zodiacList.forEach(zodiac => {
        const amount = Number(currentZodiacBets.value[zodiac]) || 0;
        zodiacBets[zodiac] = amount;
        currentTotal += amount;
        currentZodiacBets.value[zodiac] = 0;
      });
      
      // 计算波色下注
      const colorBets = {
        red: Number(currentColorBets.value.red) || 0,
        blue: Number(currentColorBets.value.blue) || 0,
        green: Number(currentColorBets.value.green) || 0
      };
      
      currentTotal += colorBets.red + colorBets.blue + colorBets.green;
      
      // 重置波色下注输入
      currentColorBets.value = { red: 0, blue: 0, green: 0 };
      
      if (currentTotal > 0) {
        bettingHistory.value.unshift({
          timestamp: Date.now(),
          bets: bets,
          zodiacBets: zodiacBets,
          colorBets: colorBets,
          total: currentTotal
        });
        saveHistory();
        recalculateTotalBets();
      }
    };

    // 打开删除确认弹窗
    const openDeleteConfirm = (index) => {
      deleteIndex.value = index;
      showConfirmModal.value = true;
      showHistoryModal.value = false;
    };

    // 删除记录
    const deleteRecord = () => {
      if (deleteIndex.value !== null) {
        bettingHistory.value.splice(deleteIndex.value, 1);
        saveHistory();
        recalculateTotalBets();
      }
      showConfirmModal.value = false;
      deleteIndex.value = null;
      showHistoryModal.value = true;
    };

    // 智能识别输入
    const parseSmartInput = () => {
      try {
        const input = smartInputText.value.trim();
        if (!input) return;

        // 统一处理所有类型的逗号（不区分中英文）
        const normalizedInput = input.replace(/，/g, ','); // 中文逗号转英文
        
        // 分割金额部分（最后一个-后的数字）
        const amountIndex = normalizedInput.lastIndexOf('-');
        let amount = 0;
        let numbersPart = normalizedInput;
        
        if (amountIndex > 0) {
          amount = parseFloat(normalizedInput.substring(amountIndex + 1)) || 0;
          numbersPart = normalizedInput.substring(0, amountIndex);
        }

        if (amount <= 0) {
          alert('请使用"号码,号码,号码-金额"格式，例如: 10,20,30-30');
          return;
        }

        // 处理号码部分（支持中英文逗号和空格分隔）
        const numberStrings = numbersPart.split(/[,，\s]+/).filter(Boolean);
        const validNumbers = [];
        
        numberStrings.forEach(numStr => {
          const num = parseInt(numStr.trim());
          if (!isNaN(num) && num >= 1 && num <= 49) {
            validNumbers.push(num);
          }
        });

        if (validNumbers.length === 0) {
          alert('未找到有效号码（1-49）');
          return;
        }

        // 应用到当前下注（累加模式）
        validNumbers.forEach(num => {
          currentBets.value[num] = (currentBets.value[num] || 0) + amount;
        });

        showSmartInput.value = false;
        smartInputText.value = '';
      } catch (error) {
        alert('解析失败，请检查输入格式');
        console.error('智能识别错误:', error);
      }
    };

    // 导出到Excel
    const exportToExcel = () => {
      if (bettingHistory.value.length === 0) {
        alert('没有可导出的下注记录');
        return;
      }

      // 准备数据
      const data = [];
      
      // 添加表头
      data.push([
        '序号', '时间', '下注号码', '下注金额', '生肖下注', '生肖金额', 
        '红波', '蓝波', '绿波', '总金额'
      ]);
      
      // 添加数据行
      bettingHistory.value.forEach((record, index) => {
        const validBets = getValidBets(record.bets);
        const betNumbers = validBets.map(num => `${num}(${getZodiac(num)})`).join(', ');
        const betAmounts = validBets.map(num => safeToFixed(record.bets[num])).join(', ');
        
        const validZodiacBets = getValidZodiacBets(record.zodiacBets);
        const zodiacNames = validZodiacBets.join(', ');
        const zodiacAmounts = validZodiacBets.map(z => safeToFixed(record.zodiacBets[z])).join(', ');
        
        data.push([
          index + 1,
          formatTime(record.timestamp),
          betNumbers,
          betAmounts,
          zodiacNames,
          zodiacAmounts,
          record.colorBets?.red ? safeToFixed(record.colorBets.red) : '0.00',
          record.colorBets?.blue ? safeToFixed(record.colorBets.blue) : '0.00',
          record.colorBets?.green ? safeToFixed(record.colorBets.green) : '0.00',
          safeToFixed(record.total)
        ]);
      });
      
      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // 设置列宽
      ws['!cols'] = [
        { wch: 6 },  // 序号
        { wch: 20 }, // 时间
        { wch: 30 }, // 下注号码
        { wch: 15 }, // 下注金额
        { wch: 15 }, // 生肖下注
        { wch: 15 }, // 生肖金额
        { wch: 8 },  // 红波
        { wch: 8 },  // 蓝波
        { wch: 8 },  // 绿波
        { wch: 10 }  // 总金额
      ];
      
      // 创建工作簿
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "下注记录");
      
      // 导出文件
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `下注记录_${dateStr}.xlsx`);
    };

    // 初始化数据
    onMounted(initializeData);

    return {
      numbers,
      zodiacList,
      currentBets,
      currentZodiacBets,
      currentColorBets,
      totalBets,
      totalZodiacBets,
      totalColorBets,
      bettingHistory,
      showSmartInput,
      showHistoryModal,
      showConfirmModal,
      smartInputText,
      deleteIndex,
      inputFields,
      safeToFixed,
      getValidBets,
      getValidZodiacBets,
      getTotalBet,
      totalAmount,
      getZodiac,
      getZodiacColor,
      getZodiacColorByZodiac,
      formatTime,
      submitBets,
      openDeleteConfirm,
      deleteRecord,
      parseSmartInput,
      exportToExcel
    };
  }
}
</script>

<style scoped>
.app-container {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.smart-recognize-btn {
  background-color: #2196F3;
  padding: 8px 15px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.smart-recognize-btn:hover {
  background-color: #0b7dda;
}

.history-btn {
  background-color: #673AB7;
  padding: 8px 15px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.history-btn:hover {
  background-color: #5e35b1;
}

.export-btn {
  background-color: #FF9800;
  padding: 8px 15px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.export-btn:hover {
  background-color: #f57c00;
}

/* 通用弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0 10px;
}

.close-btn:hover {
  color: #333;
}

/* 智能识别弹窗 */
.modal-content textarea {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  min-height: 100px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.parse-btn {
  background-color: #4CAF50;
  color: white;
  padding: 8px 20px;
}

.cancel-btn {
  background-color: #f44336;
  color: white;
  padding: 8px 20px;
}

/* 历史记录弹窗 */
.history-modal {
  padding: 15px;
}

.history-list {
  margin-top: 10px;
}

.empty-history {
  text-align: center;
  padding: 30px;
  color: #999;
}

.history-item {
  margin-bottom: 15px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.history-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ddd;
}

.history-time {
  font-weight: bold;
  color: #333;
}

.history-total {
  margin-left: 15px;
  color: #e74c3c;
  font-weight: bold;
}

.delete-btn {
  margin-left: auto;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

.history-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bet-detail {
  padding: 4px 10px;
  border-radius: 3px;
  border: 1px solid #ddd;
  font-size: 13px;
  background-color: #fff;
}

.bet-detail.red-wave {
  background-color: rgba(255, 0, 0, 0.1);
  border-color: rgba(255, 0, 0, 0.3);
}

.bet-detail.blue-wave {
  background-color: rgba(0, 0, 255, 0.1);
  border-color: rgba(0, 0, 255, 0.3);
}

.bet-detail.green-wave {
  background-color: rgba(0, 255, 0, 0.1);
  border-color: rgba(0, 255, 0, 0.3);
}

/* 确认弹窗 */
.confirm-modal {
  text-align: center;
  max-width: 400px;
}

.confirm-modal h3 {
  margin-top: 0;
  color: #333;
}

.confirm-modal p {
  margin: 15px 0 25px;
  color: #666;
}

.confirm-btn {
  background-color: #f44336;
  color: white;
  padding: 8px 20px;
}

/* 主界面样式 */
.betting-container {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.left-panel, .right-panel {
  height: 800px;
  overflow-y: scroll;
  flex: 1;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

h3 {
  margin: 15px 0 10px 0;
  color: #555;
}

.number-grid, .result-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.number-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px;
  border-radius: 3px;
  border: 1px solid transparent;
}

.number-label {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 12px;
  text-align: center;
}

input {
  width: 60px;
  padding: 5px;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 3px;
}

button {
  padding: 8px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background-color: #45a049;
}

.result-item {
  text-align: center;
  padding: 5px;
  border: 1px solid;
  border-radius: 3px;
  transition: background-color 0.3s;
}

.result-number {
  font-weight: bold;
  font-size: 12px;
}

.result-amount {
  color: #e74c3c;
}

/* 生肖下注样式 */
.zodiac-bet-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.zodiac-bet-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid;
}

.zodiac-label {
  font-weight: bold;
  margin-bottom: 5px;
}

.zodiac-result-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 15px 0;
}

.zodiac-result-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid;
}

.zodiac-result-item .zodiac-label {
  font-weight: bold;
}

.zodiac-result-item .result-amount {
  color: #e74c3c;
  font-weight: bold;
}

/* 波色下注样式 */
.color-bet-container {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.color-bet-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 5px;
}

.color-label {
  font-weight: bold;
  margin-bottom: 8px;
}

.red-wave {
  background-color: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
}

.blue-wave {
  background-color: rgba(0, 0, 255, 0.1);
  border: 1px solid rgba(0, 0, 255, 0.3);
}

.green-wave {
  background-color: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.color-result-container {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.color-result-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  padding: 8px 15px;
  border-radius: 5px;
}

.color-result-item .color-label {
  font-weight: bold;
}

.color-result-item .result-amount {
  color: #e74c3c;
  font-weight: bold;
}
</style>