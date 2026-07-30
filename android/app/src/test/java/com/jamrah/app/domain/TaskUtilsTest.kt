package com.jamrah.app.domain

import com.jamrah.app.domain.model.*
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TaskUtilsTest {
    @Test fun `newTaskId starts with task_`() { assertTrue(newTaskId().startsWith("task_")) }
    @Test fun `priorityValue High returns 3`() { assertEquals(3, priorityValue("High")) }
    @Test fun `priorityValue Medium returns 2`() { assertEquals(2, priorityValue("Medium")) }
    @Test fun `priorityValue Low returns 1`() { assertEquals(1, priorityValue("Low")) }
    @Test fun `priorityValue None returns 0`() { assertEquals(0, priorityValue("none")) }
    @Test fun `recLabel daily returns Daily`() { assertEquals("Daily", recLabel("daily", null)) }
    @Test fun `recLabel weekly returns Weekly`() { assertEquals("Weekly", recLabel("weekly", null)) }
    @Test fun `recLabel monthly returns Monthly`() { assertEquals("Monthly", recLabel("monthly", null)) }
    @Test fun `recLabel none returns empty`() { assertEquals("", recLabel("none", null)) }
    @Test fun `recLabel null returns empty`() { assertEquals("", recLabel(null, null)) }
    @Test fun `expandRecurringTasks returns single non-recurring task`() {
        val task = TaskItem(id="1", name="Test", createdAt=todayKey(), completed=0)
        val result = expandRecurringTasks(listOf(task))
        assertEquals(1, result.size)
    }
    @Test fun `expandRecurringTasks expands daily tasks`() {
        val task = TaskItem(id="1", name="Daily", createdAt="2027-01-01 00:00:00",
            recurrence="daily", durationStart="2027-01-01", durationEnd="2027-01-03")
        val result = expandRecurringTasks(listOf(task))
        assertTrue(result.size >= 3)
    }
    @Test fun `todayKey returns yyyy-MM-dd format`() {
        assertTrue(todayKey().matches(Regex("\\d{4}-\\d{2}-\\d{2}")))
    }
    @Test fun `dateKey formats correctly`() {
        val cal = java.util.Calendar.getInstance()
        cal.set(2026, 0, 15)
        assertEquals("2026-01-15", dateKey(cal.time))
    }
}
