/**
 * 使用技巧 store：工作台可分别维护「用户端 / 管理端」两套使用技巧
 * 数据存后端 /api/admin/tips/；分权：管理员仅可维护用户端内容，管理端内容仅超管可写
 * 某端在库中为空时自动灌入演示种子（仅首次；无权限时静默跳过），
 * 此后增删改均走接口，两端「使用说明」页实时同步
 */
import { reactive } from 'vue'

import { tipsAdminApi, type ApiTip } from '@/api'

export interface TipItem {
  id: string
  /** 技巧内容 */
  text: string
}

export type TipScope = 'user' | 'admin'

interface TipData {
  user: TipItem[]
  admin: TipItem[]
}

/** 演示种子：与两端「使用说明」页默认展示的使用技巧一致（对应端库为空时自动灌入） */
const SEED: Record<TipScope, string[]> = {
  // 用户端「使用说明」页的使用技巧
  user: [
    '答案中的 [1][2] 是引用角标，点开“引用来源”可核对录音原文或板书原图，不怕 AI 编造',
    '纪要里的「录音 03:24」角标点开可查看该时间点的转写原文，复习时精准回听',
    '智能问答输入框支持语音提问与附件上传（图片 / PPT / 文档）；Enter 发送、Shift+Enter 换行',
    '视频材料会自动抽帧并去重，只保留信息量最大的关键帧，无需手动截屏或调参',
    '练习中做错的题会自动收进错题本，点开错题卡片可回看完整题目与解析，按章节重练巩固薄弱点',
  ],
  // 管理端「使用说明」页的使用技巧
  admin: [
    '演示环境下手机号 / 邮箱验证码统一为 123456；重置密码至少 8 位。',
    '停用账号只禁止登录、不删除数据，随时可以恢复；操作前会弹出二次确认。',
    '管理员账号两端通用：在用户端登录会先进入管理端，工作台可一键回到用户端。',
    '用户名修改后，欢迎语的称呼、侧边栏卡片会同步更新（重新登录同样生效）。',
    '看板图表与动态为演示数据，接入后端后替换为统计接口即可，页面结构不变。',
  ],
}

/** 两端使用技巧（工作台读写；进入工作台时调 ensureTipsLoaded 拉取） */
export const tips = reactive<TipData>({ user: [], admin: [] })

function itemFromApi(t: ApiTip): TipItem {
  return { id: String(t.id), text: t.text }
}

let tipsInFlight: Promise<void> | null = null
export function ensureTipsLoaded(): Promise<void> {
  if (!tipsInFlight) {
    tipsInFlight = (async () => {
      try {
        const [userList, adminList] = await Promise.all([
          tipsAdminApi.list('user'),
          tipsAdminApi.list('admin'),
        ])
        for (const scope of ['user', 'admin'] as const) {
          const list = scope === 'user' ? userList : adminList
          if (list.length > 0) {
            tips[scope].splice(0, tips[scope].length, ...list.map(itemFromApi))
            continue
          }
          // 对应端库为空：重查一次（防止两个端同时触发灌入产生重复），仍为空才灌入演示种子
          // （无权限时后端 403，静默跳过）
          try {
            const recheck = await tipsAdminApi.list(scope)
            if (recheck.length > 0) {
              tips[scope].splice(0, tips[scope].length, ...recheck.map(itemFromApi))
              continue
            }
            const created: TipItem[] = []
            for (const text of SEED[scope]) {
              const t = await tipsAdminApi.create({ scope, text })
              created.push(itemFromApi(t))
            }
            tips[scope].splice(0, tips[scope].length, ...created)
          } catch {
            // 管理员无权写管理端内容：留空，展示端回退内置默认
          }
        }
      } finally {
        tipsInFlight = null
      }
    })()
  }
  return tipsInFlight
}

/** 新增一条使用技巧 */
export async function addTip(scope: TipScope, text: string) {
  const t = await tipsAdminApi.create({ scope, text })
  tips[scope].push(itemFromApi(t))
}

/** 更新一条使用技巧的内容 */
export async function updateTip(scope: TipScope, id: string, text: string) {
  await tipsAdminApi.update(id, { text })
  const item = tips[scope].find((t) => t.id === id)
  if (item) item.text = text
}

/** 删除一条使用技巧 */
export async function removeTip(scope: TipScope, id: string) {
  await tipsAdminApi.remove(id)
  const i = tips[scope].findIndex((t) => t.id === id)
  if (i >= 0) tips[scope].splice(i, 1)
}
