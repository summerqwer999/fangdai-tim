/**
 * 柚子工具网 (UZTOOL.COM) - 房贷计算器核心逻辑引擎
 * 针对 GitHub Pages 环境优化：强制锁定 jQuery 作用域
 */
(function($) {
    // 所有的计算逻辑和绑定都在这里执行
    var runCalculator = function() {
        console.log("UZTOOL: 房贷深度测算引擎已就绪...");

        // --- 全局参数初始化 ---
        var businessShortRateArr6 = [5.1, 5.35, 5.6, 5.85, 6.1, 5.85, 5.6, 5.6, 5.35, 5.1, 4.85, 4.6, 3.45],
            businessShortRateArr12 = [5.56, 5.81, 6.06, 6.31, 6.56, 6.31, 6, 5.6, 5.35, 5.1, 4.85, 4.6, 3.45],
            businessShortRateArr36 = [5.6, 5.85, 6.1, 6.4, 6.65, 6.4, 6.15, 6, 5.75, 5.5, 5.25, 5, 3.45],
            businessShortRateArr60 = [5.96, 6.22, 6.45, 6.65, 6.9, 6.65, 6.4, 6, 5.75, 5.5, 5.25, 5, 4.2],
            businessLongRateArr = [6.14, 6.4, 6.6, 6.8, 7.05, 6.8, 6.55, 6.15, 5.9, 5.65, 5.4, 5.15, 4.2],
            PAFShortRateArr = [3.5, 3.75, 4, 4.2, 4.45, 4.2, 4, 3.75, 3.5, 3.25, 3, 2.75, 2.75],
            PAFLongRateArr = [4.05, 4.3, 4.5, 4.7, 4.45, 4.7, 4.5, 4.25, 4, 3.75, 3.5, 3.25, 3.25],
            loanType = 0,
            loanPeriods = 240,
            businessPeriodType = 4,
            PAFPeriodType = 1,
            businessRateType = 12,
            PAFRateType = 12,
            businessDiscount = 1,
            showResultTabID = 1,
            simpleDataTableMaxLines = 10;

        // --- 交互逻辑绑定 ---

        // 贷款类型切换
        $("#business_calc, #PAF_calc, #mix_calc").on("click", function() {
            if ($(this).hasClass("normal-tab")) {
                $(this).removeClass("normal-tab").addClass("select-tab").siblings(".tab").removeClass("select-tab").addClass("normal-tab");
                var id = $(this).attr("id");
                if (id === "business_calc") {
                    $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, #business_atc_recmd_mod").show();
                    $("#PAF_sum_line, #PAF_rate_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #PAF_atc_recmd_mod").hide();
                    loanType = 0;
                } else if (id === "PAF_calc") {
                    $("#PAF_sum_line, #PAF_rate_line, #PAF_atc_recmd_mod").show();
                    $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #business_atc_recmd_mod").hide();
                    loanType = 1;
                } else {
                    $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, #PAF_sum_line, #PAF_rate_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #business_atc_recmd_mod").show();
                    $("#PAF_atc_recmd_mod").hide();
                    loanType = 2;
                }
            }
        });

        // 结果选项卡切换
        $(".result-tab").on("click", function() {
            if ($(this).hasClass("normal-tab")) {
                $(this).removeClass("normal-tab").addClass("select-tab").siblings(".result-tab").removeClass("select-tab").addClass("normal-tab");
                var tid = $(this).attr("tab-id");
                $("#result_data_" + tid).show().siblings(".result-data").hide();
                showResultTabID = parseInt(tid);
            }
        });

        // 贷款期限联动
        $("#loan_period_select").on("change", function() {
            var val = parseInt($(this).val());
            if (val == 0) { loanPeriods = 6; PAFPeriodType = businessPeriodType = 0; }
            else if (val == 1) { loanPeriods = 12; businessPeriodType = 1; PAFPeriodType = 0; }
            else if (val <= 3) { loanPeriods = 12 * val; businessPeriodType = 2; PAFPeriodType = 0; }
            else if (val <= 5) { loanPeriods = 12 * val; businessPeriodType = 3; PAFPeriodType = 0; }
            else { loanPeriods = 12 * val; businessPeriodType = 4; PAFPeriodType = 1; }
            
            $("#loan_period_select_bar").text($(this).find("option:selected").text());
            if ($("#business_rate_select").attr("input-method") == "auto") businessRateUpdate();
            if ($("#PAF_rate_select").attr("input-method") == "auto") PAFRateUpdate();
        });

        // 利率选择联动
        $("#business_rate_select").on("change", function() {
            businessRateType = $(this).val();
            $("#business_rate_select_bar").text($(this).find("option:selected").text());
            if (businessRateType == -1) {
                $("#business_discount_field").hide();
                $("#business_rate_select_field").removeClass("long-field");
                $("#business_rate").val("");
                $(this).attr("input-method", "hand");
            } else {
                $("#business_rate_select_field").addClass("long-field");
                $("#business_discount_field").show();
                $(this).attr("input-method", "auto");
                businessRateUpdate();
            }
        });

        $("#business_discount").on("change", function() {
            businessDiscount = parseFloat($(this).find("option:selected").attr("data-discount"));
            $("#business_discount_bar").text($(this).find("option:selected").text());
            businessRateUpdate();
        });

        $("#PAF_rate_select").on("change", function() {
            PAFRateType = $(this).val();
            $("#PAF_rate_select_bar").text($(this).find("option:selected").text());
            if (PAFRateType == -1) {
                $("#PAF_rate").val("");
                $(this).attr("input-method", "hand");
            } else {
                $(this).attr("input-method", "auto");
                PAFRateUpdate();
            }
        });

        // 主按钮点击
        $("#calculate").on("click", function() {
            if (userInputCheck()) {
                calculate();
                window.scrollTo(0, 0);
                $("[view=calc_input]").hide();
                $("[view=calc_result]").show();
            }
        });

        $("#recalculate").on("click", function() {
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=calc_input]").show();
        });

        $(".view-more").on("click", function() {
            var detailId = $(this).attr("data-detail");
            $("#data_detail_" + detailId).show().siblings(".data-container").hide();
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=data_detail]").show();
            $("#data_detail_bar").show();
        });

        $("#back_to_calc_input").on("click", function() {
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=calc_input]").show();
        });

        $("#back_to_calc_result").on("click", function() {
            window.scrollTo(0, 0);
            $("#data_detail_bar").hide();
            $("[view=data_detail]").hide();
            $("[view=calc_result]").show();
        });

        // --- 内部逻辑函数 ---

        function businessRateUpdate() {
            var rate = 0;
            if (businessPeriodType == 0) rate = businessShortRateArr6[businessRateType];
            else if (businessPeriodType == 1) rate = businessShortRateArr12[businessRateType];
            else if (businessPeriodType == 2) rate = businessShortRateArr36[businessRateType];
            else if (businessPeriodType == 3) rate = businessShortRateArr60[businessRateType];
            else if (businessPeriodType == 4) rate = businessLongRateArr[businessRateType];
            $("#business_rate").val(Math.round(rate * businessDiscount * 100) / 100);
        }

        function PAFRateUpdate() {
            var rate = (PAFPeriodType == 0) ? PAFShortRateArr[PAFRateType] : PAFLongRateArr[PAFRateType];
            $("#PAF_rate").val(rate);
        }

        function userInputCheck() {
            if (loanType == 0) return checkField("#business_sum") && checkField("#business_rate");
            if (loanType == 1) return checkField("#PAF_sum") && checkField("#PAF_rate");
            if (loanType == 2) return checkField("#business_sum") && checkField("#business_rate") && checkField("#PAF_sum") && checkField("#PAF_rate");
            return false;
        }

        function checkField(id) {
            var val = $.trim($(id).val());
            if (val != "" && /^\d*[\.]?\d*$/.test(val)) return true;
            $(id).val("").focus();
            return false;
        }

        function calculate() {
            calculate_debx();
            calculate_debj();
            var type = $('input[name="repayType"]:checked').val();
            $("#result_tab_" + type).removeClass("normal-tab").addClass("select-tab").siblings(".result-tab").removeClass("select-tab").addClass("normal-tab");
            $("#result_data_" + type).show().siblings(".result-data").hide();
        }

        function calculate_debx() {
            if (loanType == 0) return solveDebx(1E4 * parseFloat($("#business_sum").val()), parseFloat($("#business_rate").val()) / 1200);
            if (loanType == 1) return solveDebx(1E4 * parseFloat($("#PAF_sum").val()), parseFloat($("#PAF_rate").val()) / 1200);
            if (loanType == 2) return solveDebxMix(1E4 * parseFloat($("#business_sum").val()), parseFloat($("#business_rate").val()) / 1200, 1E4 * parseFloat($("#PAF_sum").val()), parseFloat($("#PAF_rate").val()) / 1200);
        }

        function solveDebx(total, mRate) {
            var interest = total * loanPeriods * mRate * Math.pow(1 + mRate, loanPeriods) / (Math.pow(1 + mRate, loanPeriods) - 1) - total;
            interest = Math.round(interest * 100) / 100;
            var totalRepay = Math.round((interest + total) * 100) / 100;
            var mRepay = Math.round((totalRepay / loanPeriods) * 100) / 100;
            fillResult(1, interest, totalRepay, mRepay, total, mRate);
        }

        function solveDebxMix(aSum, aRate, bSum, bRate) {
            var aInt = aSum * loanPeriods * aRate * Math.pow(1 + aRate, loanPeriods) / (Math.pow(1 + aRate, loanPeriods) - 1) - aSum;
            var bInt = bSum * loanPeriods * bRate * Math.pow(1 + bRate, loanPeriods) / (Math.pow(1 + bRate, loanPeriods) - 1) - bSum;
            var totalInt = Math.round((aInt + bInt) * 100) / 100;
            var totalRepay = Math.round((totalInt + aSum + bSum) * 100) / 100;
            var mRepay = Math.round((totalRepay / loanPeriods) * 100) / 100;
            $("#business_interest_total_1").text(Math.round(aInt * 100) / 100 + "元");
            $("#PAF_interest_total_1").text(Math.round(bInt * 100) / 100 + "元");
            fillResultMix(1, totalInt, totalRepay, mRepay, aSum, aRate, bSum, bRate);
        }

        function calculate_debj() {
            if (loanType == 0) return solveDebj(1E4 * parseFloat($("#business_sum").val()), parseFloat($("#business_rate").val()) / 1200);
            if (loanType == 1) return solveDebj(1E4 * parseFloat($("#PAF_sum").val()), parseFloat($("#PAF_rate").val()) / 1200);
            if (loanType == 2) return solveDebjMix(1E4 * parseFloat($("#business_sum").val()), parseFloat($("#business_rate").val()) / 1200, 1E4 * parseFloat($("#PAF_sum").val()), parseFloat($("#PAF_rate").val()) / 1200);
        }

        function solveDebj(total, mRate) {
            var interest = Math.round((total * mRate * (loanPeriods + 1) / 2) * 100) / 100;
            var totalRepay = Math.round((interest + total) * 100) / 100;
            var baseP = total / loanPeriods;
            fillResult(2, interest, totalRepay, 0, total, mRate, baseP);
        }

        function solveDebjMix(aSum, aRate, bSum, bRate) {
            var aInt = aSum * aRate * (loanPeriods + 1) / 2;
            var bInt = bSum * bRate * (loanPeriods + 1) / 2;
            var totalInt = Math.round((aInt + bInt) * 100) / 100;
            var totalRepay = Math.round((totalInt + aSum + bSum) * 100) / 100;
            var baseP = (aSum + bSum) / loanPeriods;
            $("#business_interest_total_2").text(Math.round(aInt * 100) / 100 + "元");
            $("#PAF_interest_total_2").text(Math.round(bInt * 100) / 100 + "元");
            fillResultMix(2, totalInt, totalRepay, 0, aSum, aRate, bSum, bRate, baseP);
        }

        function fillResult(tab, interest, totalRepay, mRepay, total, mRate, baseP) {
            $("#interest_total_" + tab).text(interest + "元");
            $("#repay_total_" + tab).text(totalRepay + "元");
            var html = "", simpleHtml = "", firstM = 0, firstI = 0;
            for (var i = 1; i <= loanPeriods; i++) {
                var curI, curM, curP, rem;
                if (tab == 1) { // 等额本息
                    curI = Math.round(total * mRate * (Math.pow(1 + mRate, loanPeriods) - Math.pow(1 + mRate, i - 1)) / (Math.pow(1 + mRate, loanPeriods) - 1) * 100) / 100;
                    curM = mRepay; curP = Math.round((curM - curI) * 100) / 100;
                    rem = Math.round(total * (Math.pow(1 + mRate, loanPeriods) - Math.pow(1 + mRate, i)) / (Math.pow(1 + mRate, loanPeriods) - 1) * 100) / 100;
                } else { // 等额本金
                    curI = Math.round(total * mRate * (loanPeriods - i + 1) / loanPeriods * 100) / 100;
                    curP = Math.round(baseP * 100) / 100; curM = Math.round((curI + curP) * 100) / 100;
                    rem = Math.round(total * (loanPeriods - i) / loanPeriods * 100) / 100;
                }
                if(i == 1) { firstM = curM; firstI = curI; }
                var row = "<tr><td>"+i+"</td><td>"+curM+"</td><td>"+curI+"</td><td>"+curP+"</td><td>"+rem+"</td></tr>";
                html += row; if(i <= simpleDataTableMaxLines) simpleHtml += row;
            }
            $("#standard_data_table_" + tab).html(html);
            $("#simple_data_table_" + tab).html(simpleHtml);
            $("#repay_monthly_" + tab).text(firstM + "元");
            $("#interest_monthly_" + tab).text(firstI + "元");
        }

        function fillResultMix(tab, interest, totalRepay, mRepay, aSum, aRate, bSum, bRate, baseP) {
            $("#interest_total_" + tab).text(interest + "元");
            $("#repay_total_" + tab).text(totalRepay + "元");
            var html = "", simpleHtml = "", firstM = 0, firstI = 0;
            for (var i = 1; i <= loanPeriods; i++) {
                var curI, curM, curP, rem;
                if (tab == 1) { // 组合-本息
                    var curAI = aSum * aRate * (Math.pow(1 + aRate, loanPeriods) - Math.pow(1 + aRate, i - 1)) / (Math.pow(1 + aRate, loanPeriods) - 1);
                    var curBI = bSum * bRate * (Math.pow(1 + bRate, loanPeriods) - Math.pow(1 + bRate, i - 1)) / (Math.pow(1 + bRate, loanPeriods) - 1);
                    curI = Math.round((curAI + curBI) * 100) / 100;
                    curM = mRepay; curP = Math.round((curM - curI) * 100) / 100;
                    var remA = aSum * (Math.pow(1 + aRate, loanPeriods) - Math.pow(1 + aRate, i)) / (Math.pow(1 + aRate, loanPeriods) - 1);
                    var remB = bSum * (Math.pow(1 + bRate, loanPeriods) - Math.pow(1 + bRate, i)) / (Math.pow(1 + bRate, loanPeriods) - 1);
                    rem = Math.round((remA + remB) * 100) / 100;
                } else { // 组合-本金
                    curI = Math.round((aSum * aRate * (loanPeriods - i + 1) / loanPeriods + bSum * bRate * (loanPeriods - i + 1) / loanPeriods) * 100) / 100;
                    curP = Math.round(baseP * 100) / 100; curM = Math.round((curI + curP) * 100) / 100;
                    rem = Math.round(((aSum + bSum) * (loanPeriods - i) / loanPeriods) * 100) / 100;
                }
                if(i == 1) { firstM = curM; firstI = curI; }
                var row = "<tr><td>"+i+"</td><td>"+curM+"</td><td>"+curI+"</td><td>"+curP+"</td><td>"+rem+"</td></tr>";
                html += row; if(i <= simpleDataTableMaxLines) simpleHtml += row;
            }
            $("#standard_data_table_" + tab).html(html);
            $("#simple_data_table_" + tab).html(simpleHtml);
            $("#repay_monthly_" + tab).text(firstM + "元");
            $("#interest_monthly_" + tab).text(firstI + "元");
        }
    };

    // 自动检测 jQuery 是否加载完成，并在加载后立即执行
    if (window.jQuery) {
        runCalculator();
    } else {
        var checkJQ = setInterval(function() {
            if (window.jQuery) {
                runCalculator();
                clearInterval(checkJQ);
            }
        }, 50);
    }
})(window.jQuery);
