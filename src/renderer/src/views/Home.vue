<template>
  <div class="app-container">
    <div class="header">
      <h1>记账系统</h1>
    </div>

    <!-- 智能识别弹窗 -->
    <div v-if="showSmartInput" class="modal-overlay">
      <div class="modal-content">
        <h3>智能识别下注</h3>
        <textarea
          v-model="smartInputText"
          placeholder="例如: 10,20,30-30 表示10/20/30各下注30元&#10;10,20,30--30 表示从这三个号码各减去30元"
          rows="5"
        ></textarea>
        <div class="modal-buttons">
          <button @click="parseSmartInput" class="parse-btn">解析</button>
          <button @click="showSmartInput = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>
    <!-- 成功提示 -->
    <div v-if="showSuccess" class="success-message">
      <p>下注成功！</p>
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
                {{ num }} ({{ getZodiac(num) }}): {{ record.bets[num] >= 0 ? '+' : ''
                }}{{ safeToFixed(record.bets[num]) }}
              </div>
              <div
                v-for="zodiac in getValidZodiacBets(record.zodiacBets)"
                :key="`zodiac-${zodiac}`"
                class="bet-detail"
                :style="{ backgroundColor: getZodiacColorByZodiac(zodiac, 0.1) }"
              >
                {{ zodiac }}: {{ record.zodiacBets[zodiac] >= 0 ? '+' : ''
                }}{{ safeToFixed(record.zodiacBets[zodiac]) }} ({{
                  getZodiacNumbers(zodiac).join(',')
                }})
              </div>
              <div
                v-if="record.colorBets && record.colorBets.red !== 0"
                class="bet-detail red-wave"
              >
                红波: {{ record.colorBets.red >= 0 ? '+' : ''
                }}{{ safeToFixed(record.colorBets.red) }} ({{ getColorNumbers('red').join(',') }})
              </div>
              <div
                v-if="record.colorBets && record.colorBets.blue !== 0"
                class="bet-detail blue-wave"
              >
                蓝波: {{ record.colorBets.blue >= 0 ? '+' : ''
                }}{{ safeToFixed(record.colorBets.blue) }} ({{ getColorNumbers('blue').join(',') }})
              </div>
              <div
                v-if="record.colorBets && record.colorBets.green !== 0"
                class="bet-detail green-wave"
              >
                绿波: {{ record.colorBets.green >= 0 ? '+' : ''
                }}{{ safeToFixed(record.colorBets.green) }} ({{
                  getColorNumbers('green').join(',')
                }})
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
              v-model.number="currentZodiacBets[zodiac]"
              placeholder="金额"
              @keydown.enter="submitBets"
            />
            <div class="zodiac-numbers">{{ getZodiacNumbers(zodiac).join(',') }}</div>
          </div>
        </div>

        <h3>波色下注</h3>
        <div class="color-bet-container">
          <div class="color-bet-item red-wave">
            <div class="color-label">红波</div>
            <input
              type="number"
              v-model.number="currentColorBets.red"
              placeholder="金额"
              @keydown.enter="submitBets"
            />
            <div class="color-numbers">{{ getColorNumbers('red').join(',') }}</div>
          </div>
          <div class="color-bet-item blue-wave">
            <div class="color-label">蓝波</div>
            <input
              type="number"
              v-model.number="currentColorBets.blue"
              placeholder="金额"
              @keydown.enter="submitBets"
            />
            <div class="color-numbers">{{ getColorNumbers('blue').join(',') }}</div>
          </div>
          <div class="color-bet-item green-wave">
            <div class="color-label">绿波</div>
            <input
              type="number"
              v-model.number="currentColorBets.green"
              placeholder="金额"
              @keydown.enter="submitBets"
            />
            <div class="color-numbers">{{ getColorNumbers('green').join(',') }}</div>
          </div>
        </div>
        <div class="header-buttons">
          <button @click="submitBets" class="submit-btn">提交下注</button>
          <button @click="showSmartInput = true" class="smart-recognize-btn">智能识别</button>
          <button @click="showHistoryModal = true" class="history-btn">下注记录</button>
        </div>
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
              backgroundColor:
                totalZodiacBets[zodiac] > 0 ? getZodiacColorByZodiac(zodiac, 0.4) : '',
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
            <div class="color-label">蓝波 </div>
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
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'

export default {
  setup() {
    const numbers = Array.from({ length: 49 }, (_, i) => i + 1)
    const inputFields = ref([])
    const zodiacList = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

    // 生肖映射
    const zodiacMap = {
      1: '蛇',
      2: '龙',
      3: '兔',
      4: '虎',
      5: '牛',
      6: '鼠',
      7: '猪',
      8: '狗',
      9: '鸡',
      10: '猴',
      11: '羊',
      12: '马',
      13: '蛇',
      14: '龙',
      15: '兔',
      16: '虎',
      17: '牛',
      18: '鼠',
      19: '猪',
      20: '狗',
      21: '鸡',
      22: '猴',
      23: '羊',
      24: '马',
      25: '蛇',
      26: '龙',
      27: '兔',
      28: '虎',
      29: '牛',
      30: '鼠',
      31: '猪',
      32: '狗',
      33: '鸡',
      34: '猴',
      35: '羊',
      36: '马',
      37: '蛇',
      38: '龙',
      39: '兔',
      40: '虎',
      41: '牛',
      42: '鼠',
      43: '猪',
      44: '狗',
      45: '鸡',
      46: '猴',
      47: '羊',
      48: '马',
      49: '蛇'
    }

    // 生肖反向映射
    const zodiacToNumbers = {}
    zodiacList.forEach((zodiac) => {
      zodiacToNumbers[zodiac] = []
    })
    numbers.forEach((num) => {
      const zodiac = zodiacMap[num]
      if (zodiac && zodiacToNumbers[zodiac]) {
        zodiacToNumbers[zodiac].push(num)
      }
    })

    // 波色分组（直接基于数字）
    const colorToNumbers = {
      red: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
      blue: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
      green: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49]
    }

    // 获取波色对应的数字
    const getColorNumbers = (color) => {
      return colorToNumbers[color] || []
    }
    // 当前输入的下注金额
    const currentBets = ref({})
    // 当前生肖下注
    const currentZodiacBets = ref({})
    // 当前波色下注
    const currentColorBets = ref({
      red: 0,
      blue: 0,
      green: 0
    })
    // 总下注金额记录
    const totalBets = ref({})
    // 总生肖下注
    const totalZodiacBets = ref({})
    // 总波色下注
    const totalColorBets = ref({
      red: 0,
      blue: 0,
      green: 0
    })
    // 下注历史记录
    const bettingHistory = ref([])
    // 弹窗状态
    const showSmartInput = ref(false)
    const showHistoryModal = ref(false)
    const showConfirmModal = ref(false)
    const showSuccess = ref(false)
    const smartInputText = ref('')
    const deleteIndex = ref(null)

    // 获取生肖对应的数字
    const getZodiacNumbers = (zodiac) => {
      return zodiacToNumbers[zodiac] || []
    }

    // 安全数值格式化
    const safeToFixed = (value, digits = 2) => {
      const num = Number(value)
      return isNaN(num) ? '0.00' : num.toFixed(digits)
    }

    // 获取有效的下注号码
    const getValidBets = (bets) => {
      return Object.keys(bets || {}).filter((n) => bets[n] !== 0) // 修改为不等于0
    }

    // 获取有效的生肖下注
    const getValidZodiacBets = (zodiacBets) => {
      return Object.keys(zodiacBets || {}).filter((z) => zodiacBets[z] !== 0) // 修改为不等于0
    }

    // 获取单个号码的总下注金额
    const getTotalBet = (number) => {
      const total = Number(totalBets.value[number]) || 0
      return total > 0 ? total : 0 // 确保不会显示负数
    }

    // 初始化数据
    const initializeData = () => {
      numbers.forEach((num) => {
        currentBets.value[num] = 0
        totalBets.value[num] = 0
      })

      // 初始化生肖下注
      zodiacList.forEach((zodiac) => {
        currentZodiacBets.value[zodiac] = 0
        totalZodiacBets.value[zodiac] = 0
      })

      // 初始化波色下注
      currentColorBets.value = { red: 0, blue: 0, green: 0 }
      totalColorBets.value = { red: 0, blue: 0, green: 0 }

      loadHistory()
    }

    // 从本地存储加载历史记录
    const loadHistory = () => {
      const savedHistory = localStorage.getItem('bettingHistory')
      if (savedHistory) {
        try {
          bettingHistory.value = JSON.parse(savedHistory) || []
          recalculateTotalBets()
        } catch (e) {
          console.error('解析历史记录出错:', e)
          bettingHistory.value = []
        }
      }
    }

    // 重新计算总下注金额（支持负数）
    const recalculateTotalBets = () => {
      // 重置数字下注
      numbers.forEach((num) => {
        totalBets.value[num] = 0
      })

      // 重置生肖下注
      zodiacList.forEach((zodiac) => {
        totalZodiacBets.value[zodiac] = 0
      })

      // 重置波色下注
      totalColorBets.value = { red: 0, blue: 0, green: 0 }

      bettingHistory.value.forEach((record) => {
        if (record && record.bets) {
          // 统计数字下注金额（支持负数）
          numbers.forEach((num) => {
            totalBets.value[num] += Number(record.bets[num]) || 0
          })

          // 生肖下注只汇总到生肖下注区域（支持负数）
          if (record.zodiacBets) {
            zodiacList.forEach((zodiac) => {
              const zodiacAmount = Number(record.zodiacBets[zodiac]) || 0
              totalZodiacBets.value[zodiac] += zodiacAmount * getZodiacNumbers(zodiac).length
            })
          }

          // 波色下注只汇总到波色区域（支持负数）
          if (record.colorBets) {
            const redAmount = Number(record.colorBets.red) || 0
            totalColorBets.value.red += redAmount * getColorNumbers('red').length

            const blueAmount = Number(record.colorBets.blue) || 0
            totalColorBets.value.blue += blueAmount * getColorNumbers('blue').length

            const greenAmount = Number(record.colorBets.green) || 0
            totalColorBets.value.green += greenAmount * getColorNumbers('green').length
          }
        }
      })

      // 确保金额不会为负数
      numbers.forEach((num) => {
        if (totalBets.value[num] < 0) totalBets.value[num] = 0
      })
      zodiacList.forEach((zodiac) => {
        if (totalZodiacBets.value[zodiac] < 0) totalZodiacBets.value[zodiac] = 0
      })
      if (totalColorBets.value.red < 0) totalColorBets.value.red = 0
      if (totalColorBets.value.blue < 0) totalColorBets.value.blue = 0
      if (totalColorBets.value.green < 0) totalColorBets.value.green = 0
    }

    // 保存历史记录到本地存储
    const saveHistory = () => {
      localStorage.setItem('bettingHistory', JSON.stringify(bettingHistory.value))
    }

    // 计算总下注金额
    const totalAmount = computed(() => {
      const numberTotal = numbers.reduce((sum, num) => sum + (getTotalBet(num) || 0), 0)

      const zodiacTotal = zodiacList.reduce((sum, zodiac) => {
        const amount = Number(totalZodiacBets.value[zodiac]) || 0
        return sum + (amount > 0 ? amount : 0)
      }, 0)

      const colorTotal = ['red', 'blue', 'green'].reduce((sum, color) => {
        const amount = Number(totalColorBets.value[color]) || 0
        return sum + (amount > 0 ? amount : 0)
      }, 0)

      return numberTotal + zodiacTotal + colorTotal
    })

    // 获取数字对应的生肖
    const getZodiac = (number) => {
      return zodiacMap[number] || ''
    }

    // 获取数字对应的颜色
    const getZodiacColor = (number, opacity = 1) => {
      if (colorToNumbers.red.includes(number)) {
        return `rgba(255, 0, 0, ${opacity})`
      } else if (colorToNumbers.blue.includes(number)) {
        return `rgba(0, 0, 255, ${opacity})`
      } else if (colorToNumbers.green.includes(number)) {
        return `rgba(0, 255, 0, ${opacity})`
      }
      return ''
    }

    // 根据生肖获取颜色
    const getZodiacColorByZodiac = (zodiac, opacity = 1) => {
      // 查找该生肖对应的第一个数字的颜色
      const numbers = getZodiacNumbers(zodiac)
      if (numbers.length > 0) {
        return getZodiacColor(numbers[0], opacity)
      }
      return ''
    }

    // 格式化时间显示
    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
    }

    // 提交下注（支持负数）
    const submitBets = () => {
      let currentTotal = 0
      const bets = {}
      const zodiacBets = {}

      // 计算数字下注（允许负数）
      numbers.forEach((num) => {
        const amount = Number(currentBets.value[num]) || 0
        bets[num] = amount
        currentTotal += amount
        currentBets.value[num] = 0
      })

      // 计算生肖下注（允许负数）
      zodiacList.forEach((zodiac) => {
        const amount = Number(currentZodiacBets.value[zodiac]) || 0
        zodiacBets[zodiac] = amount
        if (amount !== 0) {
          const zodiacNums = getZodiacNumbers(zodiac)
          currentTotal += amount * zodiacNums.length
        }
        currentZodiacBets.value[zodiac] = 0
      })

      // 计算波色下注（允许负数）
      const colorBets = {
        red: Number(currentColorBets.value.red) || 0,
        blue: Number(currentColorBets.value.blue) || 0,
        green: Number(currentColorBets.value.green) || 0
      }
      if (colorBets.red !== 0) {
        const redNums = getColorNumbers('red')
        currentTotal += colorBets.red * redNums.length
      }
      if (colorBets.blue !== 0) {
        const blueNums = getColorNumbers('blue')
        currentTotal += colorBets.blue * blueNums.length
      }
      if (colorBets.green !== 0) {
        const greenNums = getColorNumbers('green')
        currentTotal += colorBets.green * greenNums.length
      }

      // 重置波色下注输入
      currentColorBets.value = { red: 0, blue: 0, green: 0 }

      // 只要有变动（正数或负数）就记录
      if (currentTotal !== 0) {
        bettingHistory.value.unshift({
          timestamp: Date.now(),
          bets: bets,
          zodiacBets: zodiacBets,
          colorBets: colorBets,
          total: currentTotal
        })
        saveHistory()
        recalculateTotalBets()
        showSuccess.value = true
        // 2秒后自动隐藏成功提示
        setTimeout(() => {
          showSuccess.value = false
        }, 2000)
        }
    }

    // 打开删除确认弹窗
    const openDeleteConfirm = (index) => {
      deleteIndex.value = index
      showConfirmModal.value = true
      showHistoryModal.value = false
    }

    // 删除记录
    const deleteRecord = () => {
      if (deleteIndex.value !== null) {
        bettingHistory.value.splice(deleteIndex.value, 1)
        saveHistory()
        recalculateTotalBets()
      }
      showConfirmModal.value = false
      deleteIndex.value = null
      showHistoryModal.value = true
    }
    // 智能识别输入（支持多种格式和负数）
// 修改parseSmartInput方法
const parseSmartInput = () => {
  try {
    const input = smartInputText.value.trim()
    if (!input) return

    // 统一处理所有分隔符（中文顿号、中文逗号、英文逗号、斜杠、点、句号）
    let normalizedInput = input
      .replace(/、|，|。|\/|\.(?=\D)/g, ',') // 替换非数字间的点号
      .replace(/\s+/g, '') // 移除所有空格

    // 特殊处理"各X"格式（移动到前面处理）
    if (normalizedInput.includes('各')) {
      const parts = normalizedInput.split('各')
      if (parts.length === 2) {
        const items = parts[0].split(',')
        const amount = parseFloat(parts[1]) || 0
        if (amount !== 0) {
          items.forEach(item => {
            if (!item) return
            
            // 处理波色
            if (['红波', '红', 'red'].includes(item.toLowerCase())) {
              currentColorBets.value.red = (currentColorBets.value.red || 0) + amount
            } else if (['蓝波', '蓝', 'blue'].includes(item.toLowerCase())) {
              currentColorBets.value.blue = (currentColorBets.value.blue || 0) + amount
            } else if (['绿波', '绿', 'green'].includes(item.toLowerCase())) {
              currentColorBets.value.green = (currentColorBets.value.green || 0) + amount
            } 
            // 处理生肖
            else if (zodiacList.includes(item)) {
              currentZodiacBets.value[item] = (currentZodiacBets.value[item] || 0) + amount
            }
            // 处理数字
            else {
              const num = parseInt(item)
              if (!isNaN(num) && num >= 1 && num <= 49) {
                currentBets.value[num] = (currentBets.value[num] || 0) + amount
              }
            }
          })
          
          showSmartInput.value = false
          smartInputText.value = ''
          return
        }
      }
    }

    // 以下是原有的处理逻辑（处理其他格式）
    const amountPattern = /((一粒|一个|-)(\d+))|(-?\d+)$/
    const amountMatch = normalizedInput.match(amountPattern)

    let amount = 0
    let itemsPart = normalizedInput

    if (amountMatch) {
      // 处理"一粒X"/"一个X"格式
      if (amountMatch[2]) {
        amount = parseFloat(amountMatch[3]) || 0
        itemsPart = normalizedInput.substring(0, amountMatch.index)
      }
      // 处理"-X"或单独数字格式
      else if (amountMatch[4]) {
        amount = parseFloat(amountMatch[4]) || 0
        itemsPart = normalizedInput.substring(0, amountMatch.index)
      }
    }

    if (amount === 0) {
      return // 无效金额不处理
    }

    // 处理号码/生肖/波色部分
    const itemStrings = itemsPart.split(',')
    const validNumbers = []
    const validZodiacs = []
    let colorType = null

    itemStrings.forEach((itemStr) => {
      if (!itemStr) return
      
      // 检查是否是波色
      if (['红波', '红', 'red'].includes(itemStr.toLowerCase())) {
        colorType = 'red'
      } else if (['蓝波', '蓝', 'blue'].includes(itemStr.toLowerCase())) {
        colorType = 'blue'
      } else if (['绿波', '绿', 'green'].includes(itemStr.toLowerCase())) {
        colorType = 'green'
      } 
      // 检查是否是生肖
      else if (zodiacList.includes(itemStr)) {
        validZodiacs.push(itemStr)
      }
      // 否则尝试解析为数字
      else {
        const num = parseInt(itemStr)
        if (!isNaN(num) && num >= 1 && num <= 49) {
          validNumbers.push(num)
        }
      }
    })

    if (validNumbers.length === 0 && validZodiacs.length === 0 && !colorType) {
      return // 无有效项不处理
    }

    // 应用到当前下注
    validNumbers.forEach((num) => {
      currentBets.value[num] = (currentBets.value[num] || 0) + amount
    })

    validZodiacs.forEach((zodiac) => {
      currentZodiacBets.value[zodiac] = (currentZodiacBets.value[zodiac] || 0) + amount
    })

    if (colorType) {
      currentColorBets.value[colorType] = (currentColorBets.value[colorType] || 0) + amount
    }

    showSmartInput.value = false
    smartInputText.value = ''
  } catch (error) {
    console.error('智能识别错误:', error)
  }
}

    // 导出到Excel
    const exportToExcel = () => {
      if (bettingHistory.value.length === 0) {
        return
      }
      // 准备数据
      const data = []

      // 添加表头
      data.push([
        '序号',
        '时间',
        '下注号码',
        '下注金额',
        '生肖下注',
        '生肖金额',
        '红波',
        '蓝波',
        '绿波',
        '总金额'
      ])

      // 添加数据行
      bettingHistory.value.forEach((record, index) => {
        const validBets = getValidBets(record.bets)
        const betNumbers = validBets.map((num) => `${num}(${getZodiac(num)})`).join(', ')
        const betAmounts = validBets
          .map((num) => (record.bets[num] >= 0 ? '+' : '') + safeToFixed(record.bets[num]))
          .join(', ')

        const validZodiacBets = getValidZodiacBets(record.zodiacBets)
        const zodiacNames = validZodiacBets.join(', ')
        const zodiacAmounts = validZodiacBets
          .map((z) => (record.zodiacBets[z] >= 0 ? '+' : '') + safeToFixed(record.zodiacBets[z]))
          .join(', ')

        data.push([
          index + 1,
          formatTime(record.timestamp),
          betNumbers,
          betAmounts,
          zodiacNames,
          zodiacAmounts,
          record.colorBets?.red
            ? (record.colorBets.red >= 0 ? '+' : '') + safeToFixed(record.colorBets.red)
            : '0.00',
          record.colorBets?.blue
            ? (record.colorBets.blue >= 0 ? '+' : '') + safeToFixed(record.colorBets.blue)
            : '0.00',
          record.colorBets?.green
            ? (record.colorBets.green >= 0 ? '+' : '') + safeToFixed(record.colorBets.green)
            : '0.00',
          safeToFixed(record.total)
        ])
      })

      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet(data)

      // 设置列宽
      ws['!cols'] = [
        { wch: 6 }, // 序号
        { wch: 20 }, // 时间
        { wch: 30 }, // 下注号码
        { wch: 15 }, // 下注金额
        { wch: 15 }, // 生肖下注
        { wch: 15 }, // 生肖金额
        { wch: 8 }, // 红波
        { wch: 8 }, // 蓝波
        { wch: 8 }, // 绿波
        { wch: 10 } // 总金额
      ]

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '下注记录')

      // 导出文件
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `下注记录_${dateStr}.xlsx`)
    }

    // 初始化数据
    onMounted(initializeData)

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
      showSuccess,
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
      getZodiacNumbers,
      getColorNumbers,
      getZodiacColor,
      getZodiacColorByZodiac,
      formatTime,
      submitBets,
      openDeleteConfirm,
      deleteRecord,
      parseSmartInput,
      exportToExcel
    }
  }
}
</script>

<style scoped>
.app-container {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px;
  font-size: 13px;
}

.header {
  text-align: center;
  margin-bottom: 10px;
}

.header h1 {
  font-size: 1.3em;
  margin: 5px 0;
}

.betting-container {
  display: flex;
  gap: 10px;
  height: calc(100vh - 120px);
  overflow: hidden;
}

.left-panel,
.right-panel {
  flex: 1;
  padding: 10px;
  border-radius: 5px;
  background-color: #f5f5f5;
  overflow-y: auto;
}

h2, h3 {
  margin: 6px 0;
  font-size: 1.1em;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 12px;
}

.number-item {
  padding: 5px;
  border-radius: 3px;
  text-align: center;
  font-size: 12px;
}

.number-item input {
  width: 70%;
  padding: 3px;
  margin-top: 3px;
  font-size: 12px;
  text-align: center;
}

.zodiac-bet-container,
.color-bet-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.zodiac-bet-item,
.color-bet-item {
  padding: 5px;
  border-radius: 3px;
  text-align: center;
  border: 1px solid #ddd;
  font-size: 12px;
}

.zodiac-bet-item input,
.color-bet-item input {
  width: 70%;
  padding: 3px;
  margin-top: 3px;
  font-size: 12px;
  text-align: center;
}

.zodiac-numbers,
.color-numbers {
  font-size: 0.7em;
  color: #666;
  margin-top: 3px;
}

.header-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* 按钮样式 - 完全保留 */
button {
  padding: 6px 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-weight: bold;
  font-size: 12px;
}

.submit-btn {
  background-color: #4caf50;
  color: white;
}

.smart-recognize-btn {
  background-color: #2196f3;
  color: white;
}

.history-btn {
  background-color: #ff9800;
  color: white;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 12px;
}

.result-item {
  padding: 5px;
  border-radius: 3px;
  text-align: center;
  border: 1px solid #ddd;
  font-size: 12px;
}

.zodiac-result-container,
.color-result-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.zodiac-result-item,
.color-result-item {
  padding: 5px;
  border-radius: 3px;
  text-align: center;
  border: 1px solid #ddd;
  font-size: 12px;
}

.total {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-top: 40px;
}

/* 弹窗样式 - 完全保留 */
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
  padding: 15px;
  border-radius: 6px;
  max-width: 500px;
  width: 90%;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
}

.modal-content textarea {
  width: 100%;
  margin-bottom: 12px;
  font-size: 13px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.parse-btn,
.confirm-btn {
  background-color: #4caf50;
  color: white;
}

.cancel-btn {
  background-color: #f44336;
  color: white;
}

.history-modal {
  max-width: 700px;
}

.confirm-modal {
  max-width: 350px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.3em;
  cursor: pointer;
  padding: 0;
}

.export-btn {
  background-color: #2196f3;
  color: white;
}

/* 下注记录样式 - 完全保留 */
.history-item {
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.history-time {
  font-weight: bold;
}

.history-total {
  color: #4caf50;
  font-weight: bold;
}

.history-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bet-detail {
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 0.8em;
}

.red-wave {
  background-color: rgba(255, 0, 0, 0.1);
  border-left: 3px solid rgba(255, 0, 0, 0.7);
}

.blue-wave {
  background-color: rgba(0, 0, 255, 0.1);
  border-left: 3px solid rgba(0, 0, 255, 0.7);
}

.green-wave {
  background-color: rgba(0, 255, 0, 0.1);
  border-left: 3px solid rgba(0, 255, 0, 0.7);
}

.empty-history {
  text-align: center;
  color: #666;
  padding: 15px;
}

/* 成功提示样式 - 完全保留 */
.success-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #4caf50;
  color: white;
  padding: 12px 25px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  animation: fadeInOut 2s ease-in-out;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  padding: 2px 6px;
  font-size: 0.7em;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* 响应式调整 */
@media (max-width: 1600px) {
  .zodiac-bet-container,
  .color-bet-container,
  .zodiac-result-container,
  .color-result-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1400px) {
  .number-grid {
    grid-template-columns: repeat(6, 1fr);
  }
  
  .zodiac-bet-container,
  .color-bet-container,
  .zodiac-result-container,
  .color-result-container {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
