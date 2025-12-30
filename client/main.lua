local display = false
local tabletProp = nil
local tabletModel = "prop_cs_tablet"
local tabletDict = "amb@world_human_seat_wall_tablet@female@base"
local tabletAnim = "base"

-- UI Açma/Kapama Fonksiyonu
function SetDisplay(bool)
    display = bool
    SetNuiFocus(bool, bool)
    SendNUIMessage({
        action = bool and "open" or "close",
        ip = "192.168.1." .. math.random(10, 99) -- Rastgele yerel IP simülasyonu
    })
    
    if bool then
        TaskStartScenarioInPlace(PlayerPedId(), "WORLD_HUMAN_STAND_MOBILE", 0, true)
        -- Daha gelişmiş animasyon için prop attach logic eklenebilir
        -- CreateTablet()
    else
        ClearPedTasks(PlayerPedId())
        -- DeleteTablet()
    end
end

-- Komut Tanımlama
RegisterCommand("hacktablet", function()
    SetDisplay(not display)
end)

-- UI Kapatma Callback'i
RegisterNUICallback("closeUI", function(data, cb)
    SetDisplay(false)
    cb("ok")
end)

-- Resource durdurulursa focus'u kaldır (Geliştirme güvenliği)
AddEventHandler('onResourceStop', function(resourceName)
  if (GetCurrentResourceName() ~= resourceName) then
    return
  end
  SetNuiFocus(false, false)
  ClearPedTasks(PlayerPedId())
  print('The resource ' .. resourceName .. ' was stopped. UI focus reset.')
end)
