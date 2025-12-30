-- Server tarafı mantığı (Dispatch entegrasyonu, Ödül verme vb.)
-- Şimdilik placeholder.

RegisterNetEvent('silent_op:hackResult')
AddEventHandler('silent_op:hackResult', function(success, target)
    local src = source
    if success then
        print(string.format("Player %s successfully hacked %s", GetPlayerName(src), target))
        -- GiveReward(src)
    else
        print(string.format("Player %s failed to hack %s", GetPlayerName(src), target))
        -- TriggerPoliceDispatch(src)
    end
end)
