/**
 * FAQ 常见问题 store：工作台可分别维护「用户端 / 首页 / 管理端」三套常见问题
 * 每条 FAQ 由 问题标题（q）与 解决描述（a）两部分组成
 * 数据存后端 /api/admin/faqs/；某端在库中为空时自动灌入演示种子（仅首次），
 * 此后增删改均走接口，用户端「使用说明 / 首页」与管理端「使用说明」实时同步
 */
import { reactive } from 'vue'

import { faqAdminApi, type ApiFaq, type FaqScopeOption } from '@/api'

export interface FaqItem {
  id: string
  /** 问题标题 */
  q: string
  /** 解决描述 */
  a: string
}

export type FaqScope = FaqScopeOption

interface FaqData {
  user: FaqItem[]
  home: FaqItem[]
  admin: FaqItem[]
}

/** 演示种子：与各展示页默认展示的 FAQ 一致（对应位置库为空时自动灌入） */
const SEED: Record<FaqScope, { q: string; a: string }[]> = {
  // 用户端「使用说明」页的常见问题
  user: [
    {
      q: '引用里的“录音 03:24”是怎么来的？',
      a: '语音转写模型会为每句话打上时间戳，纪要生成时把结论与其出处对齐，因此每个知识点都能定位到录音的精确时间点，点开角标即可核对原文。',
    },
    {
      q: '视频太大，浏览器会卡吗？',
      a: '视频在浏览器端通过 ffmpeg.wasm 抽帧，只把关键帧和音轨送往后端，传输量远小于原视频。建议单个视频不超过 20 分钟；过长可先剪辑或只上传录音。',
    },
    {
      q: '为什么纪要显示“处理失败”？',
      a: '常见原因：音频文件损坏、视频编码不受支持或网络中断。可在「我的纪要」中点击「重新处理」重试；若多次失败，请通过「问题反馈」联系我们。',
    },
    {
      q: '一节课的纪要包含哪些内容？',
      a: '按「课程主题、核心知识点、重要定义与公式、重点问题」等板块生成；课堂中没有的内容会自动省略。处理参数由系统统一按最佳配置运行，无需手动调整。',
    },
    {
      q: '我的课堂数据安全吗？',
      a: '录音、图片与纪要仅存储在你的课堂知识库中，不会参与任何模型训练；只有你本人能看到自己的课堂内容，可随时删除。',
    },
  ],
  // 用户端首页（着陆页）的常见问题
  home: [
    {
      q: '纪要里的「录音 03:24」是怎么来的？',
      a: '语音转写模型会为每句话打上时间戳，纪要生成时把结论与其出处对齐，因此每个知识点都能定位到录音的精确时间点，点开角标即可核对原文。',
    },
    {
      q: '视频太大，浏览器会卡吗？',
      a: '视频在浏览器端通过 ffmpeg.wasm 抽帧，只把关键帧和音轨送往后端，传输量远小于原视频。建议单个视频不超过 20 分钟；过长可先剪辑或只上传录音。',
    },
    {
      q: '我的课堂数据安全吗？',
      a: '录音、图片与纪要仅存储在你的课堂知识库中，不会参与任何模型训练；只有你本人能看到自己的课堂内容，可随时删除。',
    },
  ],
  // 管理端「使用说明」页的常见问题
  admin: [
    {
      q: '普通用户账号可以登录管理端吗？',
      a: '不可以。两端共用用户端首页的登录表单：普通用户账号登录后只会进入用户端；管理员 / 超级管理员账号登录后先进入管理端工作台，可在工作台一键进入用户端。',
    },
    {
      q: '管理员账号由谁创建？密码忘了怎么办？',
      a: '管理员账号统一由超级管理员在「账号管理」页创建，初始密码由超管线下告知；忘记密码时联系超级管理员重置，重置后可自行在个人设置中修改。',
    },
    {
      q: '停用管理员 / 用户账号会影响他们的数据吗？',
      a: '不会。停用仅禁止登录，账号名下的纪要、问答、题库数据全部保留；恢复后一切如常。删除类操作（如删除课堂纪要）才不可恢复，需谨慎确认。',
    },
    {
      q: '数据看板上的数字是真实的吗？',
      a: '看板核心指标（账号 / 纪要 / 问答 / 题库 / 待处理反馈）实时来自后端统计接口。常见问题均可在本页维护并同步到各展示页。',
    },
  ],
}

/** 三套 FAQ（工作台读写；进入工作台时调 ensureFaqsLoaded 拉取） */
export const faqs = reactive<FaqData>({ user: [], home: [], admin: [] })

function itemFromApi(f: ApiFaq): FaqItem {
  return { id: String(f.id), q: f.q, a: f.a }
}

let faqsInFlight: Promise<void> | null = null
export function ensureFaqsLoaded(): Promise<void> {
  if (!faqsInFlight) {
    faqsInFlight = (async () => {
      try {
        const [userList, homeList, adminList] = await Promise.all([
          faqAdminApi.list('user'),
          faqAdminApi.list('home'),
          faqAdminApi.list('admin'),
        ])
        const byScope: Record<FaqScope, ApiFaq[]> = { user: userList, home: homeList, admin: adminList }
        for (const scope of ['user', 'home', 'admin'] as const) {
          const list = byScope[scope]
          if (list.length > 0) {
            faqs[scope].splice(0, faqs[scope].length, ...list.map(itemFromApi))
            continue
          }
          // 对应位置库为空：重查一次（防止两端同时触发灌入产生重复），仍为空才灌入演示种子
          // （此后增删改均落库，id 为后端真实 id；无权限时后端 403，静默跳过）
          try {
            const recheck = await faqAdminApi.list(scope)
            if (recheck.length > 0) {
              faqs[scope].splice(0, faqs[scope].length, ...recheck.map(itemFromApi))
              continue
            }
            const created: FaqItem[] = []
            for (const seed of SEED[scope]) {
              const f = await faqAdminApi.create({ scope, q: seed.q, a: seed.a })
              created.push(itemFromApi(f))
            }
            faqs[scope].splice(0, faqs[scope].length, ...created)
          } catch {
            // 管理员无权写管理端内容：留空，展示端回退内置默认
          }
        }
      } finally {
        faqsInFlight = null
      }
    })()
  }
  return faqsInFlight
}

/** 新增一条 FAQ */
export async function addFaq(scope: FaqScope, q: string, a: string) {
  const f = await faqAdminApi.create({ scope, q, a })
  faqs[scope].push(itemFromApi(f))
}

/** 更新一条 FAQ 的标题与描述 */
export async function updateFaq(scope: FaqScope, id: string, q: string, a: string) {
  await faqAdminApi.update(id, { q, a })
  const item = faqs[scope].find((f) => f.id === id)
  if (item) {
    item.q = q
    item.a = a
  }
}

/** 删除一条 FAQ */
export async function removeFaq(scope: FaqScope, id: string) {
  await faqAdminApi.remove(id)
  const i = faqs[scope].findIndex((f) => f.id === id)
  if (i >= 0) faqs[scope].splice(i, 1)
}
