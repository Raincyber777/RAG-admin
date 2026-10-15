/**
 * FAQ 常见问题 store：工作台可分别维护「用户端 / 管理端」两套常见问题
 * 每条 FAQ 由 问题标题（q）与 解决描述（a）两部分组成
 * 种子数据与两端「使用说明」页当前展示的 FAQ 一致；演示环境持久化在本地
 * localStorage（管理端 origin），接入后端后改为接口读写并同步到两端
 */
import { reactive } from 'vue'

export interface FaqItem {
  id: string
  /** 问题标题 */
  q: string
  /** 解决描述 */
  a: string
}

export type FaqScope = 'user' | 'admin'

const FAQ_KEY = 'zy_faqs'

interface FaqData {
  user: FaqItem[]
  admin: FaqItem[]
}

const SEED: FaqData = {
  // 用户端「使用说明」页的常见问题
  user: [
    {
      id: 'u1',
      q: '引用里的“录音 03:24”是怎么来的？',
      a: '语音转写模型会为每句话打上时间戳，纪要生成时把结论与其出处对齐，因此每个知识点都能定位到录音的精确时间点，点开角标即可核对原文。',
    },
    {
      id: 'u2',
      q: '视频太大，浏览器会卡吗？',
      a: '视频在浏览器端通过 ffmpeg.wasm 抽帧，只把关键帧和音轨送往后端，传输量远小于原视频。建议单个视频不超过 20 分钟；过长可先剪辑或只上传录音。',
    },
    {
      id: 'u3',
      q: '为什么纪要显示“处理失败”？',
      a: '常见原因：音频文件损坏、视频编码不受支持或网络中断。可在「我的纪要」中点击「重新处理」重试；若多次失败，请通过「问题反馈」联系我们。',
    },
    {
      id: 'u4',
      q: '一节课的纪要包含哪些内容？',
      a: '按「课程主题、核心知识点、重要定义与公式、重点问题」等板块生成；课堂中没有的内容会自动省略。处理参数由系统统一按最佳配置运行，无需手动调整。',
    },
    {
      id: 'u5',
      q: '我的课堂数据安全吗？',
      a: '录音、图片与纪要仅存储在你的课堂知识库中，不会参与任何模型训练；只有你本人能看到自己的课堂内容，可随时删除。',
    },
  ],
  // 管理端「使用说明」页的常见问题
  admin: [
    {
      id: 'a1',
      q: '普通用户账号可以登录管理端吗？',
      a: '不可以。两端共用用户端首页的登录表单：普通用户账号登录后只会进入用户端；管理员 / 超级管理员账号登录后先进入管理端工作台，可在工作台一键进入用户端。',
    },
    {
      id: 'a2',
      q: '管理员账号由谁创建？密码忘了怎么办？',
      a: '管理员账号统一由超级管理员在「账号管理」页创建，初始密码由超管线下告知；忘记密码时联系超级管理员重置，重置后可自行在个人设置中修改。',
    },
    {
      id: 'a3',
      q: '停用管理员 / 用户账号会影响他们的数据吗？',
      a: '不会。停用仅禁止登录，账号名下的纪要、问答、题库数据全部保留；恢复后一切如常。删除类操作（如删除课堂纪要）才不可恢复，需谨慎确认。',
    },
    {
      id: 'a4',
      q: '数据看板上的数字是真实的吗？',
      a: '当前为演示环境，看板指标、热门追问词与最新动态均来自前端演示数据：热门追问词实时统计自问答记录文本，最新动态每 3.5 秒轮播一次。接入后端后由统计接口提供。',
    },
  ],
}

function load(): FaqData {
  try {
    const raw = localStorage.getItem(FAQ_KEY)
    if (raw) {
      const d = JSON.parse(raw) as FaqData
      if (Array.isArray(d.user) && Array.isArray(d.admin)) return d
    }
  } catch {
    // 数据损坏时回落到种子数据
  }
  return JSON.parse(JSON.stringify(SEED)) as FaqData
}

/** 两端 FAQ（工作台读写，持久化到 localStorage） */
export const faqs = reactive<FaqData>(load())

function persist() {
  localStorage.setItem(FAQ_KEY, JSON.stringify(faqs))
}

/** 新增一条 FAQ */
export function addFaq(scope: FaqScope, q: string, a: string) {
  faqs[scope].push({ id: 'f' + Date.now().toString(36), q, a })
  persist()
}

/** 更新一条 FAQ 的标题与描述 */
export function updateFaq(scope: FaqScope, id: string, q: string, a: string) {
  const item = faqs[scope].find((f) => f.id === id)
  if (item) {
    item.q = q
    item.a = a
    persist()
  }
}

/** 删除一条 FAQ */
export function removeFaq(scope: FaqScope, id: string) {
  const i = faqs[scope].findIndex((f) => f.id === id)
  if (i >= 0) {
    faqs[scope].splice(i, 1)
    persist()
  }
}
